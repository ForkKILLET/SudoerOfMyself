import '@/styles/index.css'
import '@xterm/xterm/css/xterm.css'

import { Context } from '@/sys0/context'
import { game0 } from '@/programs/game0'
import { PROGRAMS } from '@/programs'
import { getSysImage } from '@/data/sys_image'

const ctx = new Context(getSysImage(Object.keys(PROGRAMS)))

const terminalContainer = document.querySelector<HTMLElement>('#xterm-container')
if (! terminalContainer) throw new Error('Terminal container not found')

ctx.attach(terminalContainer)
ctx.init.spawn(game0, { name: 'game0' })
