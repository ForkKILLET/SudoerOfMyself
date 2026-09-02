import { Context } from './context'
import { Stdio } from './stdio'
import { Emitter, Events } from '@/utils/emitter'
import { Program } from './program'
import { Env, ShellVariables } from './env'
import { liftArray } from '@/utils'
import { errorMessage } from '@/utils/errors'
import { normalizeExit, normalExit, ProcessExit, ProcessSignal } from './process_exit'
import { Pid } from './process_table'
import type { JobTable, ProcessGroup } from './job'
import { defaultProcessScheduler } from './process_scheduler'
import { ProcessAccounting } from './process_usage'

export interface ProcessEvents extends Events {
  signal: [ProcessSignal]
  exit: [ProcessExit]
}

export type ProcessState = 'ready' | 'running' | 'exited'

export interface CreateProcOptions {
  name: string
  cwd?: string
  env?: Env
  stdio?: Stdio
  processGroup?: ProcessGroup | null
  foreground?: boolean
  inheritShellVariables?: boolean
  clearEnvironment?: boolean
}

export class Process extends Emitter<ProcessEvents> {
  readonly pid: Pid
  readonly processGroup: ProcessGroup | null
  readonly isForeground: boolean
  name: string
  staticName?: string
  readonly variables: ShellVariables
  readonly env: Env
  stdio: Stdio
  state: ProcessState = 'running'
  exitCode: number | null = null
  exitStatus: ProcessExit | null = null
  jobTable: JobTable | null
  readonly startedAtMs: number
  readonly accounting = new ProcessAccounting()

  // TODO: Replace elapsed wall time with scheduler-owned CPU accounting once
  // Worker execution can be dynamically instrumented.
  get elapsedTimeMs() {
    return Math.max(0, this.monotonicNow() - this.startedAtMs)
  }

  private _cwd = '/'
  private pendingSignals: ProcessSignal[] = []

  private monotonicNow() {
    return this.ctx.time?.monotonic.nowMs() ?? performance.now()
  }

  get cwd() {
    return this._cwd
  }

  get ppid(): Pid | 0 {
    return this.parent?.pid ?? 0
  }

  set cwd(cwd: string) {
    this._cwd = cwd
    this.variables.set('PWD', cwd)
  }

  constructor(
    public readonly ctx: Context,
    public parent: Process | null,
    options: CreateProcOptions,
  ) {
    super()

    this.startedAtMs = this.monotonicNow()
    this.name = options.name
    this.variables = parent && options.inheritShellVariables
      ? parent.variables.clone()
      : new ShellVariables(options.clearEnvironment ? {} : parent?.variables.environment())
    Object.entries(options.env ?? {}).forEach(([name, value]) => {
      this.variables.set(name, value, { exported: true })
    })
    this.env = this.variables.values
    this.cwd = options.cwd ?? parent?.cwd ?? '/'
    this.stdio = options.stdio ?? parent?.stdio.fork() ?? Stdio.fromTerm(ctx.term)
    this.processGroup = options.processGroup === undefined
      ? parent?.processGroup ?? null
      : options.processGroup
    this.isForeground = options.foreground ?? true
    this.jobTable = parent?.jobTable ?? null
    this.pid = ctx.processes.register(this)
    this.processGroup?.add(this)
  }

  subProcesses: Process[] = []

  get fgProcess(): Process | undefined {
    return this.subProcesses.find(process => process.isForeground)
  }

  fork(options: CreateProcOptions) {
    if (this.state === 'exited') throw new Error('Exited process cannot fork')
    const proc = new Process(this.ctx, this, options)
    this.subProcesses.unshift(proc)
    return proc
  }

  sendSignal(signal: ProcessSignal) {
    if (this.state === 'exited') return
    if (this.state === 'ready') {
      this.pendingSignals.push(signal)
      return
    }
    this.emit('signal', signal)
  }

  private startProgram<T>(run: () => T) {
    if (this.state !== 'ready') throw new Error('Only a ready process can be started')
    this.state = 'running'
    const result = this.measureUser(run)
    const pendingSignals = this.pendingSignals
    this.pendingSignals = []
    pendingSignals.forEach(signal => this.emit('signal', signal))
    return result
  }

  measureUser<T>(run: () => T) {
    const startedAt = this.monotonicNow()
    try {
      return run()
    }
    finally {
      this.accounting.addUser(this.monotonicNow() - startedAt)
    }
  }

  signalForeground(signal: ProcessSignal) {
    if (this.state === 'exited') return
    const foregroundChildren = this.subProcesses.filter(process => process.isForeground)
    if (foregroundChildren.length) {
      foregroundChildren.forEach(child => child.signalForeground(signal))
    }
    else this.sendSignal(signal)
  }

  private finish(exitStatus: ProcessExit) {
    if (this.state === 'exited') return
    this.state = 'exited'
    this.exitCode = exitStatus.code
    this.exitStatus = exitStatus
    this.stdio.close()
    this.emit('exit', exitStatus)
    this.parent?.accounting.addChild(this.accounting.totalUsage)
    this.processGroup?.remove(this)
    this.ctx.processes.unregister(this)
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
    proc.state = 'ready'
    const scheduler = this.ctx.scheduler ?? defaultProcessScheduler
    let exitStatus: ProcessExit
    try {
      exitStatus = normalizeExit(await scheduler.schedule(() => (
        proc.startProgram(() => program(proc, name, ...args))
      )))
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
}
