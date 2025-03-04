import '@/styles/index.css'
import '@xterm/xterm/css/xterm.css'

import '@/effects/xterm_ex'
import '@/effects/vanilla_ex'
import '@/effects/chalk_init'

import { Context } from '@/sys0/context'
import game0 from '@/programs/game0'

const ctx = new Context()
Object.assign(window, { ctx })

ctx.attach(document.querySelector('#xterm-container')!)
ctx.init.spawn(game0, { name: 'game0' })
