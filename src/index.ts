import '@/styles/index.css'
import '@xterm/xterm/css/xterm.css'

import { Context } from '@/sys0/context'
import { game0 } from '@/programs/game0'
import { NATIVE_PROGRAMS } from '@/programs'
import { getBinImage, getRootImage } from '@/data/sys_image'
import { prepareCrossOriginIsolation } from '@/cross_origin_isolation'
import { showRecoveryMode, showStartupBlockedMode } from '@/recovery'
import { IndexedDbFileSystemStore } from '@/sys0/fs/indexed_db'
import { QueuedFsPersistence } from '@/sys0/fs/persistence'
import { TimeService } from '@/sys0/time'
import { QueuedGameClockPersistence } from '@/sys0/time_persistence'
import {
  acquireFileSystemWriterLock,
  FileSystemWriterLockUnavailableError,
  FileSystemWriterLockUnsupportedError,
} from '@/sys0/fs/writer_lock'

const start = async () => {
  const store = await IndexedDbFileSystemStore.open()
  let disposeTimePersistence = () => {}
  try {
    const persistence = await QueuedFsPersistence.create(store)
    const clockPersistence = await QueuedGameClockPersistence.create(store)
    const time = new TimeService({ gameState: clockPersistence.load() })
    const saveClock = () => clockPersistence.commit(time.game.checkpoint())
    const clockSubscription = time.game.onChange(state => clockPersistence.commit(state))
    if (! clockPersistence.load()) saveClock()

    const heartbeat = setInterval(saveClock, 5_000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        time.game.suspend()
        saveClock()
        void clockPersistence.flush().catch(error => console.error('Could not save game clock', error))
      }
      else time.game.unsuspend()
    }
    const onPageHide = () => {
      time.game.suspend()
      saveClock()
      void clockPersistence.flush().catch(error => console.error('Could not save game clock', error))
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
    disposeTimePersistence = () => {
      clearInterval(heartbeat)
      clockSubscription.dispose()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
    }

    const ctx = new Context(getRootImage(), {
      mounts: [{
        path: '/bin',
        image: getBinImage(Object.keys(NATIVE_PROGRAMS)),
        readOnly: true,
      }],
      fsPersistence: persistence,
      nativePrograms: NATIVE_PROGRAMS,
      time,
    })

    const terminalContainer = document.querySelector<HTMLElement>('#xterm-container')
    if (! terminalContainer) throw new Error('Terminal container not found')

    ctx.attach(terminalContainer)
    ctx.init.spawn(game0, { name: 'game0' })
    await Promise.all([ctx.fs.flush(), clockPersistence.flush()])
  }
  catch (error) {
    disposeTimePersistence()
    store.close()
    throw error
  }
}

const boot = async () => {
  if (! await prepareCrossOriginIsolation()) return
  const writerLock = await acquireFileSystemWriterLock()
  try {
    await start()
  }
  catch (error) {
    writerLock.release()
    throw error
  }
  try {
    await navigator.storage.persist?.()
  }
  catch (error) {
    console.warn('Could not request persistent browser storage', error)
  }
}

void boot().catch((error: unknown) => {
  if (error instanceof FileSystemWriterLockUnavailableError) {
    showStartupBlockedMode(
      error,
      'HumanOS is already running',
      'Continue in the existing tab, or close it and reload this page.',
    )
    return
  }
  if (error instanceof FileSystemWriterLockUnsupportedError) {
    showStartupBlockedMode(
      error,
      'This browser cannot safely open HumanOS',
      'Use a browser that supports the Web Locks API.',
    )
    return
  }
  showRecoveryMode(error)
})
