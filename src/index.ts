import '@/styles/index.css'
import '@xterm/xterm/css/xterm.css'

import { Context } from '@/sys0/context'
import { game0 } from '@/programs/game0'
import { PROGRAMS } from '@/programs'
import { getSysImage, SYSTEM_FS_MIGRATIONS } from '@/data/sys_image'
import { prepareCrossOriginIsolation } from '@/cross_origin_isolation'

const start = () => {
  const ctx = new Context(getSysImage(Object.keys(PROGRAMS)), SYSTEM_FS_MIGRATIONS)

  const terminalContainer = document.querySelector<HTMLElement>('#xterm-container')
  if (! terminalContainer) throw new Error('Terminal container not found')

  ctx.attach(terminalContainer)
  ctx.init.spawn(game0, { name: 'game0' })
}

void prepareCrossOriginIsolation().then((isReady) => {
  if (isReady) start()
})
