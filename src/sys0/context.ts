import { Process } from './proc'
import { Term } from './term'
import { Fs } from './fs'
import { Vfs } from './fs/vfs'

export class Context {
  term: Term
  init: Process
  fs: Fs
  fgProc: Process

  constructor(initialImage: Vfs.DirVfile) {
    this.term = new Term()
    this.fs = new Fs(this, initialImage)
    this.fgProc = this.init = new Process(this, null, {
      name: 'init',
      env: {
        PWD: '/home',
        HOME: '/home',
        PATH: '/bin',
      },
    })

    this.term.on('interrupt', () => {
      this.fgProc.emit('interrupt')
    })
  }

  attach(element: HTMLElement) {
    this.term.open(element)
  }
}
