import { Context } from './context'
import { Stdio } from './stdio'
import { Emitter, Events } from '@/utils/emitter'
import { Program } from './program'
import { createEnv, Env } from './env'

export interface ProcessEvents extends Events {
    'interrupt': []
}

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
        options: CreateProcOptions
    ) {
        super()

        this.name = options.name
        this.env = createEnv({ ...parent?.env, ...options.env })
        this.cwd = options.cwd ?? parent?.cwd ?? '/'
        this.stdio = options.stdio ?? Stdio.fromTerm(ctx.term)
    }

    subProcesses: Process[] = []

    get fgProcess(): Process | undefined {
        return this.subProcesses.at(0)
    }

    fork(options: CreateProcOptions) {
        const proc = new Process(this.ctx, this, options)
        this.subProcesses.unshift(proc)
        this.ctx.fgProc = proc // TODO: schedule
        return proc
    }

    log(msg: any | any[]) {
        Array.lift(msg).forEach(msg => {
            this.stdio.writeLn(`${this.staticName ?? this.name}: ${msg}`)
        })
    }

    error(err: any | any[]) {
        Array.lift(err).forEach(err => {
            if (err instanceof Error) console.error(err)
            this.stdio.writeLn(`${this.staticName ?? this.name}: ${err}`)
        })
    }

    async spawn(program: Program, options: CreateProcOptions, ...args: string[]) {
        const { name } = options
        const proc = this.fork(options)
        try {
            const ret = await program(proc, name, ...args)
            return ret
        }
        catch (err) {
            console.error(err)
            this.stdio.writeLn(`${name}: ${err}`)
            return 128
        }
        finally {
            this.subProcesses.shift()
            this.ctx.fgProc = this
        }
    }
}