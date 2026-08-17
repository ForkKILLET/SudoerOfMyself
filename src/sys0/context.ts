import { Process } from './proc'
import { Term } from './term'
import { Fs, FsMigration } from './fs'
import { Vfs } from './fs/vfs'

export class Context {
  term: Term
  init: Process
  fs: Fs

  get fgProc(): Process {
    let process = this.init
    while (process.fgProcess) process = process.fgProcess
    return process
  }

  constructor(initialImage: Vfs.DirVfile, migrations: readonly FsMigration[] = []) {
    this.term = new Term()
    this.fs = new Fs(initialImage, {
      getCwd: () => this.fgProc.cwd,
      migrations,
    })
    this.init = new Process(this, null, {
      name: 'init',
      env: {
        PWD: '/home',
        HOME: '/home',
        PATH: '/bin',
      },
    })

    this.term.on('interrupt', () => {
      this.init.interrupt()
    })
  }

  attach(element: HTMLElement) {
    this.term.open(element)
  }
}
