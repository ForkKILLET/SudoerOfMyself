import { Term } from './term'
import { sleep } from '@/utils'
import { Emitter, Events } from '@/utils/emitter'
import { FRead, FReadKeyOptions, FReadWrite, FWrite } from './fs'
import { Pred } from '@/utils/types'

export interface StdinEvents extends Events {
    'data': [ string ]
}   

export const kStdin = Symbol('Stdin')
export const kStdout = Symbol('Stdout')

export class Stdin extends Emitter<StdinEvents> implements FRead {
    readonly [kStdin] = true
    isDisabled = false

    constructor(private term: Term) {
        super()

        this.term.on('data', data => {
            if (this.isDisabled) return
            this.emit('data', data)
        })
    }

    async readKey({
        abort
    }: FReadKeyOptions = {}) {
        return new Promise<string | null>(resolve => {
            let done = false
            const { dispose } = this.on('data', data => {
                resolve(data)
                done = true
            }, { once: true })

            abort?.signal.then(() => {
                if (done) return
                dispose()
                resolve(null)
            })
        })
    }

    async *readChar() {
        while (true) {
            const key = await this.readKey()
            if (! key) return '\0'
            yield *key
        }
    }

    async readUntil(pred: Pred<string>) {
        let data = ''
        for await (const char of this.readChar()) {
            if (char === '\0' || pred(char)) break
            data += char
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

    constructor(
        public input: FRead,
        public output: FWrite
    ) {}

    static fromTerm(term: Term) {
        const input = new Stdin(term)
        const output = new Stdout(term)
        const stdio = new Stdio(input, output)

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
    write(data: string) { this.output.write(data) }
    writeLn(data: string) { this.output.writeLn(data) }
}