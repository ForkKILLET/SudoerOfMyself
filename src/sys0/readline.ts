import { AbortEmitter, compute, Computed, createSignal, prop } from '@/utils'
import { MakeOptional, StrictPick } from '@/utils/types'
import { Process } from './proc'
import { GridDisplay } from './display'
import { Term } from './term'
import chalk from 'chalk'

export type DoPrevent = boolean

export interface CompCandidate {
    display: string
    value: string
}

export interface ReadlineReadLnOptions {
    history?: ReadlineHistory
    doEcho?: boolean
    onCompletion?: (line: ReadlineCurrentLine) => CompCandidate[]
    onBeforeClear?: () => DoPrevent
    onClear?: () => void
}

export class ReadlineHistory {
    index: number

    constructor(public hist: string[] = []) {
        this.index = hist.length - 1
    }

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

export interface CompDisplay {
    type: 'grid'
    grid: GridDisplay
}

export interface CompState {
    before: string
    display: CompDisplay
    index: number | null
    candidates: string[]
    length: number
}

export class ReadlineCurrentLine {
    constructor(public history = new ReadlineHistory()) {}

    cursor = 0

    compState: CompState | null = null 

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
        public readonly term?: Term
    ) {}

    private isReadingLn = false

    private async _readLn({
        history,
        doEcho = true,
        onCompletion,
        onBeforeClear,
        onClear,
    }: ReadlineReadLnOptions): Promise<string | null> {
        const line = new ReadlineCurrentLine(history)

        const w = (str: string) => this.proc.ctx.term.getStringWidth(str)
        const useCompleton = !! (this.term && onCompletion)
    
        const hideCursor = '\x1B[?25l'
        const showCursor = '\x1B[?25h'
        const clearScreen = '\x1B[2J\x1B[H'
        const back = (width: number) => '\b'.repeat(width)
        const left = (width: number) => '\x1B[D'.repeat(width)
        const right = (width: number) => '\x1B[C'.repeat(width)
        const up = (height: number) => '\x1B[A'.repeat(height)
        const down = (height: number) => '\x1B[B'.repeat(height)
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

        const renderCompletion = (mapIndex: (compState: CompState) => number | null) => {
            const term = this.term!
            const compState = line.compState!
            const { display: { grid }, candidates } = compState

            const index = mapIndex(compState)
            if (index !== null) {
                replaceCandidate(candidates[index])
            }
            compState.index = index

            const { cursorX } = term.buffer.active
            write(
                '\n' +
                grid.toString({
                    formatter: (str, i) => index === i ? chalk.black(chalk.bgWhiteBright(str)) : str
                }) +
                hideCursor + '\r' + up(grid.rows + 1) + right(cursorX) + showCursor
            )
        }
        const clearCompletion = () => {
            const compState = line.compState!
            const term = this.term!
            const { display: { grid } } = compState

            const { cursorX } = term.buffer.active
            write(
                ('\n' + clear(term.cols)).repeat(grid.rows) +
                hideCursor + '\r' + up(grid.rows) + right(cursorX) + showCursor
            )
            line.compState = null
        }
        const replaceCandidate = (target: string) => {
            const { index, candidates } = line.compState!
            const candidate = index === null ? '' : candidates[index]
            write(
                back(w(candidate)) +
                target + line.after +
                eraseAfter(Math.max(0, w(candidate) - w(target))) + back(w(line.after))
            )
        }
        const acceptCompletion = () => {
            const { index, candidates } = line.compState!
            if (index !== null) {
                const candidate = candidates[index]
                line.content = line.before + candidate + line.after
                line.cursor += candidate.length
            }
            clearCompletion()
        }
        const discardCompletion = () => {
            replaceCandidate('')
            clearCompletion()
        }

        const abortEmitter = new AbortEmitter()
        this.proc.on('interrupt', () => abortEmitter.emit('abort'))

        while (true) {
            const data = await this.stdio.readKey({ abortEmitter })

            if (data === null) {
                if (line.compState) {
                    discardCompletion()
                    continue
                }

                write('\n')
                line.content = ''
                line.cursor = 0
                return null
            }

            if (data === '\r') { // Enter
                if (line.compState) {
                    acceptCompletion()
                    continue
                }

                write('\n')
                const { content } = line
                if (history && content.trim()) {
                    history.commit()
                }
                return content
            }
            if (data === '\x7F' || data === '\x08') { // Backspace / Ctrl + H
                if (line.compState) {
                    acceptCompletion()
                    continue
                }
                if (line.cursor) kill(1)
            }
            else if (data === '\t' || data === '\x1B[Z') { // Tab / Shift + Tab
                const dir = data === '\t' ? + 1 : - 1

                if (useCompleton) {
                    const isNew = line.before !== line.compState?.before
                    if (isNew) {
                        if (dir === - 1) continue
                        const candidates = onCompletion(line)
                        if (! candidates.length) {
                            line.compState = null
                            continue
                        }
                        else {
                            const grid = new GridDisplay(
                                this.term,
                                candidates.map(prop('display')),
                                { useEqualWidth: true }
                            )
                            line.compState = {
                                before: line.before,
                                index: null,
                                display: {
                                    type: 'grid',
                                    grid,
                                },
                                candidates: candidates.map(prop('value')),
                                length: candidates.length,
                            }
                        }
                    }

                    renderCompletion(({ index, length }) => {
                        if (isNew) return index
                        if (index === null) return dir === 1 ? 0 : length - 1
                        else return (index + dir).mod(length)
                    })
                }
            }
            else if (data === '\x1B[A') { // Up
                if (line.compState) {
                    renderCompletion(({ index, length }) =>
                        index === null ? null : (index - 1).mod(length)
                    )
                    continue
                }
                if (! history || line.isDirty) continue
                if (history.isAtBegin) continue
                const prev = history.hist[history.index - 1]
                write(rewrite(prev))
                history.index --
                line.cursor = prev.length
                line.isDirty = false
            }
            else if (data === '\x1B[B') { // Down
                if (line.compState) {
                    renderCompletion(({ index, length }) =>
                        index === null ? null : (index + 1).mod(length)
                    )
                    continue
                }
                if (! history || line.isDirty) continue
                if (history.isAtEnd) continue
                const next = history.hist[history.index + 1]
                write(rewrite(next))
                history.index ++
                line.cursor = next.length
                line.isDirty = false
            }
            else if (data === '\x1B[C') { // Right
                if (line.compState) {
                    renderCompletion(({ index, length, display: { grid: { cols, rows } } }) => {
                        if (index === null) return null
                        let row = index % rows
                        let col = index / rows | 0
                        const lastColHeight = length % rows || rows
                        col ++
                        if (col === cols || col === cols - 1 && row >= lastColHeight) {
                            col = 0
                            row = (row + 1).mod(rows)
                        }
                        return col * rows + row
                    })
                    continue
                }
                if (line.cursor === line.content.length) continue
                moveRight(1)
            }
            else if (data === '\x1B[1;5C') { // Ctrl + Right
                if (line.cursor === line.content.length) continue
                moveRight(wordEnd() - line.cursor)
            }
            else if (data === '\x1B[D') { // Left
                if (line.compState) {
                    renderCompletion(({ index, length, display: { grid: { rows, cols } } }) => {
                        if (index === null) return null
                        const lastColHeight = length % rows || rows
                        let row = index % rows
                        let col = index / rows | 0
                        col --
                        if (col < 0) {
                            row = (row - 1).mod(rows)
                            col = cols - 1 - (row < lastColHeight ? 0 : 1)
                        }
                        return col * rows + row
                    })
                    continue
                }
                if (line.compState) {
                    renderCompletion(({ index, length, display: { grid } }) =>
                        index === null ? null : (index - grid.rows).mod(length)
                    )
                    continue
                }
                if (! line.cursor) continue
                moveLeft(1)
            }
            else if (data === '\x1B[1;5D') { // Ctrl + Left
                if (! line.cursor) continue
                moveLeft(line.cursor - wordBegin())
            }
            else if (data === '\x1B\x7F') { // Alt + Backspace
                if (! line.cursor) continue
                kill(line.cursor - wordBegin())
            }
            else if (data[0] === '\x1B') { // Unknown escape sequence
                console.debug(JSON.stringify(data), [ ...data ].map(char => char.charCodeAt(0)))
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
                this.stdio.write(hideCursor + clearScreen)
                onClear?.()
                write(line.content + back(w(line.after)) + showCursor)
            }
            else if (data === '\x15') { // Ctrl + U
                write(rewrite(''))
                line.content = ''
                line.cursor = 0
            }
            else {
                if (data.charCodeAt(0) < 32) {
                    console.debug(JSON.stringify(data), [ ...data ].map(c => c.charCodeAt(0)))
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

    async readLn(options: ReadlineReadLnOptions = {}) {
        if (this.isReadingLn) throw new Error('Already reading a line.')
        this.isReadingLn = true
        const line = await this._readLn(options)
        this.isReadingLn = false
        return line
    }

    loopHandle: ReadlineLoopHandle | null = null

    createLoop(options: ReadlineLoopOptionsInit) {
        if (this.loopHandle) throw new Error('Loop already exists')
        return this.loopHandle = new ReadlineLoopHandle(this, options)
    }
}

export interface ReadlineLoopOptions extends StrictPick<ReadlineReadLnOptions, 'onCompletion'> {
    history?: ReadlineHistory
    prompt: Computed<string>
    onLine?: (line: string) => void | Promise<void>
    onEnd?: () => void
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
        const history = this.options.history ?? new ReadlineHistory()
        while (true) {
            this.writePrompt()
            const line = await Promise.race([
                this.readline.readLn({
                    history,
                    onCompletion: this.options.onCompletion,
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