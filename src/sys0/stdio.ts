import { Term } from './term'
import { Readline } from './readline'
import { Signal, sleep } from '@/utils'
import { Emitter, Events } from '@/utils/emitter'
import { Process } from './proc'

export interface StdinEvents extends Events {
    'data': [ string ]
}

export interface StdinReadOptions {
    abort?: Signal
}

export class Stdin extends Emitter<StdinEvents> {
    isDisabled = false

    constructor(private term: Term) {
        super()

        this.term.on('data', data => {
            if (this.isDisabled) return
            this.emit('data', data)
        })
    }

    async read({
        abort
    }: StdinReadOptions = {}) {
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
}

export interface StdoutEvents extends Events {
    'start-writing': []
    'stop-writing': []
}

export class Stdout extends Emitter<StdoutEvents> {
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

export class Stdio {
    isTied = true

    constructor(
        public term: Term,
        public stdin = new Stdin(term),
        public stdout = new Stdout(term)
    ) {
        stdout.on('start-writing', () => {
            if (this.isTied) stdin.isDisabled = true
        })
        stdout.on('stop-writing', () => {
            if (this.isTied) stdin.isDisabled = false
        })
    }

    read(options?: StdinReadOptions) {
        return this.stdin.read(options)
    }

    write(data: string) {
        this.stdout.write(data)
    }

    writeLn(data: string) {
        this.stdout.writeLn(data)
    }

    type(data: string, interval: number) {
        return this.stdout.type(data, interval)
    }

    createReadline(proc: Process) {
        return new Readline(proc, this.term, this)
    }
}