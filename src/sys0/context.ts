import { Process } from './proc'
import { Term } from './term'
import { Fs, FsMount } from './fs'
import { Vfs } from './fs/vfs'
import { ExecService, NativeProgramRegistry } from './exec'
import { ProcessTable } from './process_table'

export interface ContextOptions {
  mounts?: readonly FsMount[]
  nativePrograms: NativeProgramRegistry
}

export class Context {
  term: Term
  init: Process
  fs: Fs
  exec: ExecService
  processes: ProcessTable

  get fgProc(): Process {
    let process = this.init
    while (process.fgProcess) process = process.fgProcess
    return process
  }

  constructor(initialImage: Vfs.DirVfile, {
    mounts = [],
    nativePrograms,
  }: ContextOptions) {
    this.term = new Term()
    this.processes = new ProcessTable()
    this.fs = new Fs(initialImage, {
      getCwd: () => this.fgProc.cwd,
      mounts,
    })
    this.exec = new ExecService(this.fs, nativePrograms)
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
