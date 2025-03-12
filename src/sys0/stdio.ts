import { Term } from './term'
import { sleep } from '@/utils'
import { Emitter, Events } from '@/utils/emitter'
import { FRead, FReadKeyOptions, FReadWrite, FWrite } from './fs'
import { Awaitable, Pred } from '@/utils/types'
import { Disposable } from '@/utils/dispoable'

export interface StdinEvents extends Events {
    'data': [ string ]
}

export const kStdin = Symbol('Stdin')
export const kStdout = Symbol('Stdout')

export class Stdin extends Emitter<StdinEvents> implements FRead {
    readonly [kStdin] = true
    static isStdin = (obj: any): obj is Stdin => obj[kStdin]

    isDisabled = false

    constructor(private term: Term) {
        super()

        this.term.on('data', data => {
            if (this.isDisabled) return
            this.emit('data', data)
        })
    }

    readKey({
        abortEmitter
    }: FReadKeyOptions = {}) {
        return new Promise<string | null>(resolve => {
            const { dispose } = Disposable.combine(
                this.on('data', data => {
                    resolve(data)
                    dispose()
                }),
                abortEmitter?.on('abort', (() => {
                    resolve(null)
                    dispose()
                }))
            )
        })
    }

    async *readChar() {
        while (true) {
            const key = await this.readKey()
            if (! key) return '\0'
            yield *[ ...key ].map(char => char === '\r' ? '\n' : char)
        }
    }

    async readUntil(pred: Pred<string>) {
        let data = ''
        for await (const char of this.readChar()) {
            if (char === '\0' || char === '\x04' || pred(char)) break
            if (char === '\x7F') data = data.slice(0, -1)
            else data += char
        }
        return data
    }

    async read(): Promise<string> {
        return this.readUntil(() => false)
    }

    async readLn(): Promise<string> {
        return this.readUntil(char => char === '\n')
    }
}

// TODO: Stderr

export interface StdoutEvents extends Events {
    'start-writing': []
    'stop-writing': []
}

export class Stdout extends Emitter<StdoutEvents> implements FWrite {
    readonly [kStdout] = true
    static isStdout = (obj: any): obj is Stdout => obj[kStdout]

    isDisabled = false
    isWriting = false

    constructor(private term: Term) {
        super()
    }

    private startWriting() {
        this.isWriting = true
        this.emit('start-writing')
    }

    private stopWriting() {
        this.isWriting = false
        this.emit('stop-writing')
    }

    write(data: string) {
        if (this.isDisabled) return
        this.startWriting()
        this.term.write(data.replaceAll('\n', '\r\n'))
        this.stopWriting()
    }

    writeLn(data: string) {
        this.write(data + '\n')
    }

    async type(data: string, interval: number) {
        if (this.isDisabled) return
        this.startWriting()
        for (const char of data) {
            this.term.write(char)
            await sleep(interval)
        }
        this.stopWriting()
    }
}

export class Stdio implements FReadWrite {
    isTied = true
    doEcho = true

    stdin?: Stdin
    stdout?: Stdout

    constructor(
        public input: FRead,
        public output: FWrite
    ) {}

    static fromTerm(term: Term) {
        const input = new Stdin(term)
        const output = new Stdout(term)
        const stdio = new Stdio(input, output)
        stdio.stdin = input
        stdio.stdout = output

        output.on('start-writing', () => {
            if (stdio.isTied) input.isDisabled = true
        })

        output.on('stop-writing', () => {
            if (stdio.isTied) input.isDisabled = false
        })

        return stdio
    }

    readKey(options?: FReadKeyOptions) { return this.input.readKey(options) }
    read() { return this.input.read() }
    readLn() { return this.input.readLn() }
    readUntil(pred: Pred<string>) { return this.input.readUntil(pred) }
    write(data: string) { this.output.write(data) }
    writeLn(data: string) { this.output.writeLn(data) }
    async prompt(msg: string): Promise<boolean> {
        this.write(`${msg} (y/n) `)
        const line = await this.readLn()
        return line.trim().toLowerCase() === 'y'
    }
}