import { Context } from './context'
import { Stdio } from './stdio'
import { Emitter, Events } from '@/utils/emitter'
import { Program } from './program'
import { createEnv, Env } from './env'
import { liftArray } from '@/utils'
import { errorMessage } from '@/utils/errors'
import { runWorkerProgram, WorkerProgramDefinition } from '@/syscall/worker/host'
import { normalizeExit, normalExit, ProcessExit } from './process_exit'

export interface ProcessEvents extends Events {
  interrupt: []
  exit: [ProcessExit]
}

export type ProcessState = 'running' | 'exited'

export interface CreateProcOptions {
  name: string
  cwd?: string
  env?: Env
  stdio?: Stdio
}

export class Process extends Emitter<ProcessEvents> {
  name: string
  staticName?: string
  env: Env
  stdio: Stdio
  state: ProcessState = 'running'
  exitCode: number | null = null
  exitStatus: ProcessExit | null = null

  private _cwd = '/'
  get cwd() {
    return this._cwd
  }

  set cwd(cwd: string) {
    this._cwd = this.env.PWD = cwd
  }

  constructor(
    public readonly ctx: Context,
    public parent: Process | null,
    options: CreateProcOptions,
  ) {
    super()

    this.name = options.name
    this.env = createEnv({ ...parent?.env, ...options.env })
    this.cwd = options.cwd ?? parent?.cwd ?? '/'
    this.stdio = options.stdio ?? parent?.stdio ?? Stdio.fromTerm(ctx.term)
  }

  subProcesses: Process[] = []

  get fgProcess(): Process | undefined {
    return this.subProcesses.at(0)
  }

  fork(options: CreateProcOptions) {
    if (this.state === 'exited') throw new Error('Exited process cannot fork')
    const proc = new Process(this.ctx, this, options)
    this.subProcesses.unshift(proc)
    return proc
  }

  interrupt() {
    if (this.state === 'exited') return
    const foregroundChild = this.fgProcess
    if (foregroundChild) foregroundChild.interrupt()
    else this.emit('interrupt')
  }

  private finish(exitStatus: ProcessExit) {
    if (this.state === 'exited') return
    this.state = 'exited'
    this.exitCode = exitStatus.code
    this.exitStatus = exitStatus
    this.emit('exit', exitStatus)
  }

  private removeChild(child: Process) {
    const index = this.subProcesses.indexOf(child)
    if (index !== - 1) this.subProcesses.splice(index, 1)
  }

  log(msg: unknown | unknown[]) {
    liftArray(msg).forEach((msg) => {
      this.stdio.writeLn(`${this.staticName ?? this.name}: ${msg}`)
    })
  }

  error(err: unknown | unknown[]) {
    liftArray(err).forEach((err) => {
      if (err instanceof Error) console.error(err)
      this.stdio.writeErrorLn(`${this.staticName ?? this.name}: ${errorMessage(err)}`)
    })
  }

  async spawn(program: Program, options: CreateProcOptions, ...args: string[]) {
    const { name } = options
    const proc = this.fork(options)
    let exitStatus: ProcessExit
    try {
      exitStatus = normalizeExit(await program(proc, name, ...args))
    }
    catch (err) {
      console.error(err)
      proc.stdio.writeErrorLn(`${name}: ${errorMessage(err)}`)
      exitStatus = normalExit(128)
    }
    finally {
      this.removeChild(proc)
    }
    proc.finish(exitStatus)
    return exitStatus
  }

  async spawnWorker(definition: WorkerProgramDefinition, options: CreateProcOptions, ...args: string[]) {
    const { name } = options
    const proc = this.fork(options)
    let exitStatus: ProcessExit
    try {
      exitStatus = await runWorkerProgram(proc, definition, name, args)
    }
    catch (error) {
      console.error(error)
      proc.error(error)
      exitStatus = normalExit(128)
    }
    finally {
      this.removeChild(proc)
    }
    proc.finish(exitStatus)
    return exitStatus
  }
}
