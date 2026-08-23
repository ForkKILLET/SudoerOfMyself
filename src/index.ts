import '@/styles/index.css'
import '@xterm/xterm/css/xterm.css'

import { Context } from '@/sys0/context'
import { game0 } from '@/programs/game0'
import { NATIVE_PROGRAMS } from '@/programs'
import { getBinImage, getRootImage } from '@/data/sys_image'
import { prepareCrossOriginIsolation } from '@/cross_origin_isolation'

const start = () => {
  const ctx = new Context(getRootImage(), {
    mounts: [{
      path: '/bin',
      image: getBinImage(Object.keys(NATIVE_PROGRAMS)),
      readOnly: true,
    }],
    nativePrograms: NATIVE_PROGRAMS,
  })

  const terminalContainer = document.querySelector<HTMLElement>('#xterm-container')
  if (! terminalContainer) throw new Error('Terminal container not found')

  ctx.attach(terminalContainer)
  ctx.init.spawn(game0, { name: 'game0' })
}

void prepareCrossOriginIsolation().then((isReady) => {
  if (isReady) start()
})
