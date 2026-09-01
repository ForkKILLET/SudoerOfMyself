import '@/styles/index.css'
import '@xterm/xterm/css/xterm.css'

import { Context } from '@/sys0/context'
import { game0 } from '@/programs/game0'
import { NATIVE_PROGRAMS } from '@/programs'
import { getBinImage, getRootImage } from '@/data/sys_image'
import { prepareCrossOriginIsolation } from '@/cross_origin_isolation'
import { showRecoveryMode } from '@/recovery'
import { IndexedDbFileSystemStore } from '@/sys0/fs/indexed_db'
import { QueuedFsPersistence } from '@/sys0/fs/persistence'

const start = async () => {
  const store = await IndexedDbFileSystemStore.open()
  try {
    const persistence = await QueuedFsPersistence.create(store)
    if (persistence.recoveredFromPrevious) {
      console.warn('Recovered the file system from the previous valid snapshot')
    }
    const ctx = new Context(getRootImage(), {
      mounts: [{
        path: '/bin',
        image: getBinImage(Object.keys(NATIVE_PROGRAMS)),
        readOnly: true,
      }],
      fsPersistence: persistence,
      nativePrograms: NATIVE_PROGRAMS,
    })

    const terminalContainer = document.querySelector<HTMLElement>('#xterm-container')
    if (! terminalContainer) throw new Error('Terminal container not found')

    ctx.attach(terminalContainer)
    ctx.init.spawn(game0, { name: 'game0' })
    await ctx.fs.flush()
  }
  catch (error) {
    store.close()
    throw error
  }
}

const boot = async () => {
  if (! await prepareCrossOriginIsolation()) return
  await start()
  try {
    await navigator.storage.persist?.()
  }
  catch (error) {
    console.warn('Could not request persistent browser storage', error)
  }
}

void boot().catch(showRecoveryMode)
