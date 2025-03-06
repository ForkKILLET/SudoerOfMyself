import { compute, Computed, createSignal, Signal } from '@/utils'
import { MakeOptional } from '@/utils/types'
import { Process } from './proc'

export type DoPrevent = boolean

export interface ReadlineReadLnOptions {
    history?: ReadlineHistory
    doEcho: boolean
    onBeforeClear?: () => DoPrevent
    onClear?: () => void
}

export class ReadlineHistory {
    public hist = [ '' ]
    public index = 0

    get size() {
        return this.hist.length
    }

    get current() {
        return this.hist[this.index]
    }
    set current(value) {
        this.hist[this.index] = value
    }

    get isAtBegin() {
        return ! this.index
    }

    get isAtEnd() {
        return this.index === this.size - 1
    }

    commit() {
        this.hist.push('')
        this.index ++
    }
}

export class ReadlineCurrentLine {
    constructor(public history = new ReadlineHistory()) {}

    cursor = 0

    get content() {
        return this.history.current
    }
    set content(value) {
        this.history.current = value
    }

    get before() {
        return this.content.slice(0, this.cursor)
    }
    get after() {
        return this.content.slice(this.cursor)
    }

    private _isDirty = false
    get isDirty() {
        if (this.history.isAtEnd) return !! this.content
        return this._isDirty
    }
    set isDirty(value) {
        if (this.history.isAtEnd) return
        if (value) {
            this._isDirty = true
            const { size } = this.history
            this.history.hist[size - 1] = this.history.current
            this.history.index = size - 1
        }
        else {
            this._isDirty = false
        }
    }
}

export class Readline {
    constructor(
        public readonly proc: Process,
        public readonly stdio = proc.stdio,
    ) {}

    private isReadingLn = false

    private async _readLn(
        toBeInterrupted: Signal,
        {
            history,
            doEcho = true,
            onBeforeClear,
            onClear,
        }: Partial<ReadlineReadLnOptions> = {},
    ): Promise<string | null> {
        const line = new ReadlineCurrentLine(history)

        const w = (str: string) => this.proc.ctx.term.getStringWidth(str)
    
        const back = (width: number) => '\b'.repeat(width)
        const left = (width: number) => '\x1B[D'.repeat(width)
        const right = (width: number) => '\x1B[C'.repeat(width)
        const clear = (width: number) => ' '.repeat(width)
        const eraseAfter = (width: number) => clear(width) + back(width)
        const rewrite = (str: string) => (
            back(w(line.before)) + str + eraseAfter(Math.max(0, w(line.content) - w(str)))
        )
        const write = (char: string) => {
            if (doEcho) this.stdio.write(char)
        }

        const wordBegin = () => {
            let i = line.cursor
            while (i && line.content[i - 1] === ' ') i --
            while (i && line.content[i - 1] !== ' ') i --
            return i
        }
        const wordEnd = () => {
            let i = line.cursor
            while (i !== line.content.length && line.content[i] !== ' ') i ++
            while (i !== line.content.length && line.content[i] === ' ') i ++
            return i
        }

        const kill = (length: number) => {
            line.isDirty = true
            const erased = line.content.slice(line.cursor - length, line.cursor)
            const erasedWidth = w(erased)
            const { after } = line
            line.content = line.content.slice(0, line.cursor - length) + after
            write(back(erasedWidth) + after + eraseAfter(erasedWidth) + back(w(after)))
            line.cursor -= length
        }
        const moveLeft = (length: number) => {
            line.isDirty = true
            write(left(w(line.content.slice(line.cursor - length, line.cursor))))
            line.cursor -= length
        }
        const moveRight = (length: number) => {
            line.isDirty = true
            write(right(w(line.content.slice(line.cursor, line.cursor + length))))
            line.cursor += length
        }

        while (true) {
            const data = await this.stdio.readKey({ abort: toBeInterrupted })
            if (data === null) {
                line.content = ''
                line.cursor = 0
                return null
            }

            if (data === '\r') { // Enter
                write('\n')
                const { content } = line
                if (history && content.trim()) {
                    history.commit()
                }
                return content
            }
            if (data === '\x7F' || data === '\x08') { // Backspace / Ctrl + H
                if (line.cursor) kill(1)
            }
            else if (data[0] === '\x1B') { // Esc
                switch (data.slice(1)) {
                case '[A': { // Up
                    if (! history || line.isDirty) break
                    if (history.isAtBegin) break
                    const prev = history.hist[history.index - 1]
                    write(rewrite(prev))
                    history.index --
                    line.cursor = prev.length
                    line.isDirty = false
                    break
                }
                case '[B': { // Down
                    if (! history || line.isDirty) break
                    if (history.isAtEnd) break
                    const next = history.hist[history.index + 1]
                    write(rewrite(next))
                    history.index ++
                    line.cursor = next.length
                    line.isDirty = false

                    break
                }
                case '[C': // Right
                    if (line.cursor === line.content.length) break
                    moveRight(1)
                    break
                case '[1;5C': // Ctrl + Right
                    if (line.cursor === line.content.length) break
                    moveRight(wordEnd() - line.cursor)
                    break
                case '[D': // Arrow left
                    if (! line.cursor) break
                    moveLeft(1)
                    break
                case '[1;5D': // Ctrl + Left
                    if (! line.cursor) break
                    moveLeft(line.cursor - wordBegin())
                    break
                case '\x7F': { // Alt + Backspace
                    if (! line.cursor) break
                    kill(line.cursor - wordBegin())
                    break
                }
                default:
                    console.debug('ESC', data, [ ...data.slice(1) ].map(c => c.charCodeAt(0)))
                    break
                }
            }
            else if (data === '\x01') { // Ctrl + A
                if (line.before) line.isDirty = true
                write(left(w(line.before)))
                line.cursor = 0
            }
            else if (data === '\x05') { // Ctrl + E
                if (line.after) line.isDirty = true
                write(right(w(line.after)))
                line.cursor = line.content.length
            }
            else if (data === '\x0C') { // Ctrl + L
                if (onBeforeClear?.()) continue
                this.stdio.write('\x1B[?25l\x1B[2J\x1B[H')
                onClear?.()
                write(line.content + back(w(line.after)) + '\x1B[?25h')
            }
            else if (data === '\x15') { // Ctrl + U
                write(rewrite(''))
                line.content = ''
                line.cursor = 0
            }
            else if (data === '\t') { // Tab
                // TODO: completion
            }
            else {
                if (data.charCodeAt(0) < 32) {
                    console.debug([ ...data ].map(c => c.charCodeAt(0)))
                    continue
                }
                line.isDirty = true
                const inserted = data
                const after = line.after
                line.content = line.before + inserted + after
                line.cursor += data.length
                write(inserted + after + '\b'.repeat(w(after)))
            }
        }
    }

    async readLn(options?: Partial<ReadlineReadLnOptions>) {
        if (this.isReadingLn) throw new Error('Already reading a line.')
        this.isReadingLn = true

        const toBeInterrupted = createSignal()
        const { dispose } = this.proc.on('interrupt', () => {
            this.stdio.writeLn('')
            toBeInterrupted.trigger()
        })

        const line = await this._readLn(toBeInterrupted, options)

        this.isReadingLn = false
        dispose()

        return line
    }

    loopHandle: ReadlineLoopHandle | null = null

    createLoop(options: ReadlineLoopOptionsInit) {
        if (this.loopHandle) throw new Error('Loop already exists')
        return this.loopHandle = new ReadlineLoopHandle(this, options)
    }
}

export interface ReadlineLoopOptions {
    prompt: Computed<string>
    onLine?: (line: string) => void | Promise<void>
    onEnd?: () => void
    onCompletion?: (state: {
        cursor: number
        before: string
        line: string
    }) => void
    onInterrupt?: () => DoPrevent
}

export type ReadlineLoopOptionsInit = MakeOptional<ReadlineLoopOptions, 'prompt'>

export class ReadlineLoopHandle {
    options: ReadlineLoopOptions

    constructor(
        public readonly readline: Readline,
        options: ReadlineLoopOptionsInit
    ) {
        this.options = options as ReadlineLoopOptions
        this.options.prompt ??= '> '
    }

    toStop = createSignal()

    stop() {
        this.readline.loopHandle = null
        this.toStop.trigger()
        this.options.onEnd?.()
    }

    writePrompt() {
        this.readline.stdio.write(compute(this.options.prompt))
    }

    async start() {
        const history = new ReadlineHistory()
        while (true) {
            this.writePrompt()
            const line = await Promise.race([
                this.readline.readLn({
                    history,
                    onClear: () => this.writePrompt(),
                }),
                this.toStop.signal,
            ])
            if (line === null) {
                if (this.options.onInterrupt?.()) continue
                break
            }
            if (! line.trim()) continue
            await this.options.onLine?.(line)
        }
    }
}