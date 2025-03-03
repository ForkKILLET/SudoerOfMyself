import { Context } from './context'
import { Stdio } from './stdio'
import { Emitter, Events } from '@/utils/emitter'
import { Program } from './program'
import { createEnv, Env } from './env'

export interface ProcessEvents extends Events {
    'interrupt': []
}

export interface ForkOptions {
    name: string
    cwd?: string
    env?: Env
}

export class Process extends Emitter<ProcessEvents> {
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
        public name: string,
        cwd: string,
        env: Env,
    ) {
        super()
        
        this.env = createEnv({ ...parent?.env, ...env })
        this.cwd = cwd
        this.stdio = new Stdio(ctx.term)
    }

    subProcesses: Process[] = []

    get fgProcess(): Process | undefined {
        return this.subProcesses.at(0)
    }

    fork({
        name,
        cwd = this.cwd,
        env = {},
    }: ForkOptions) {
        const proc = new Process(this.ctx, this, name, cwd, env)
        this.subProcesses.unshift(proc)
        this.ctx.fgProc = proc // TODO: schedule
        return proc
    }

    error(err: string | string[]) {
        Array.lift(err).forEach(err => this.stdio.writeLn(`${this.name}: ${err}`))
    }

    async spawn(program: Program, name: string, ...args: string[]) {
        const proc = this.fork({ name })
        try {
            const ret = await program(proc, name, ...args)
            return ret
        }
        catch (err) {
            this.stdio.writeLn(`${name}: ${err}`)
            return 128
        }
        finally {
            this.subProcesses.shift()
            this.ctx.fgProc = this
        }
    }
}