import '@/styles/index.css'
import '@xterm/xterm/css/xterm.css'

import { Context } from '@/sys0/context'
import { createGame0, game0 } from '@/programs/game0'
import { getInstalledNativeProgramNames, getNativePrograms, hsh } from '@/programs'
import { getBinImage, getRootImage } from '@/data/sys_image'
import { prepareCrossOriginIsolation } from '@/cross_origin_isolation'
import {
  showRecoveryMode,
  showRequestedRecoveryMode,
  showStartupBlockedMode,
} from '@/recovery'
import { IndexedDbFileSystemStore } from '@/sys0/fs/indexed_db'
import { QueuedFsPersistence } from '@/sys0/fs/persistence'
import { TimeService } from '@/sys0/time'
import { QueuedGameClockPersistence } from '@/sys0/time_persistence'
import {
  acquireFileSystemWriterLock,
  FileSystemWriterLockUnavailableError,
  FileSystemWriterLockUnsupportedError,
} from '@/sys0/fs/writer_lock'
import { parseBootMode } from '@/boot_mode'
import { getStorageNamespace } from '@/storage_namespace'
import { setupImmersiveMode } from '@/immersive_mode'
import { setupTerminalSize } from '@/terminal_size'

const mode = parseBootMode(location.search)
const storage = getStorageNamespace(mode.debug)

const start = async () => {
  const store = await IndexedDbFileSystemStore.open({ databaseName: storage.databaseName })
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
    const onPageShow = () => time.game.unsuspend()
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)
    disposeTimePersistence = () => {
      clearInterval(heartbeat)
      clockSubscription.dispose()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', onPageShow)
    }

    const ctx = new Context(getRootImage(), {
      mounts: [{
        path: '/bin',
        image: getBinImage(getInstalledNativeProgramNames(mode.debug)),
        readOnly: true,
      }],
      fsPersistence: persistence,
      nativePrograms: getNativePrograms(mode.debug),
      time,
    })

    const terminalContainer = document.querySelector<HTMLElement>('#xterm-container')
    if (! terminalContainer) throw new Error('Terminal container not found')
    const app = document.querySelector<HTMLElement>('#app')
    const immersiveModeButton = document.querySelector<HTMLButtonElement>('#immersive-mode-button')
    if (! app || ! immersiveModeButton) throw new Error('Application shell not found')

    ctx.attach(terminalContainer)
    setupTerminalSize({
      app,
      shell: terminalContainer.parentElement !,
      container: terminalContainer,
      term: ctx.term,
    })
    ctx.init.spawn(mode.debug ? createGame0(hsh) : game0, { name: 'game0' })
    await Promise.all([ctx.fs.flush(), clockPersistence.flush()])
    setupImmersiveMode({
      container: app,
      button: immersiveModeButton,
      keyboardTarget: terminalContainer,
      focusApplication: () => ctx.term.focus(),
    })
  }
  catch (error) {
    disposeTimePersistence()
    store.close()
    throw error
  }
}

const boot = async () => {
  if (mode.recovery) {
    showRequestedRecoveryMode(storage)
    return
  }
  if (! await prepareCrossOriginIsolation()) return
  const writerLock = await acquireFileSystemWriterLock({ lockName: storage.writerLockName })
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
      storage,
    )
    return
  }
  if (error instanceof FileSystemWriterLockUnsupportedError) {
    showStartupBlockedMode(
      error,
      'This browser cannot safely open HumanOS',
      'Use a browser that supports the Web Locks API.',
      storage,
    )
    return
  }
  showRecoveryMode(error, storage)
})
