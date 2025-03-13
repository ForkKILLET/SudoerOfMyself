import { AbortEmitter, compute, Computed, createSignal, equalBy, getCommonPrefix, pick, prop } from '@/utils'
import { MakeOptional, StrictPick } from '@/utils/types'
import { Process } from './proc'
import { GridDisplay } from './display'
import { Term } from './term'
import chalk from 'chalk'
import stripAnsi from 'strip-ansi'

export type DoPrevent = boolean

export interface CompCandidate {
    display: string
    value: string
}

export type CompProvider = (line: ReadlineCurrentLine) => CompCandidate[]

export interface ReadlineReadLnOptions {
    history?: ReadlineHistory
    onComp?: CompProvider
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

export interface CompSource {
    content: string
    cursor: number
}

export interface CompDisplay {
    type: 'grid'
    grid: GridDisplay
}

export interface CompState {
    source: CompSource
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
        public readonly term: Term
    ) {}

    private isReadingLn = false

    private async _readLn({
        history,
        onComp,
        onBeforeClear,
        onClear,
    }: ReadlineReadLnOptions): Promise<string> {
        const line = new ReadlineCurrentLine(history)

        const w = (str: string) => this.proc.ctx.term.getStringWidth(str)
        const useCompleton = !! onComp

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

        const write = (char: string) => this.stdio.write(char)
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
            markDirty()
            const erased = line.content.slice(line.cursor - length, line.cursor)
            const erasedWidth = w(erased)
            const { after } = line
            line.content = line.content.slice(0, line.cursor - length) + after
            write(back(erasedWidth) + after + eraseAfter(erasedWidth) + back(w(after)))
            line.cursor -= length
        }
        const moveLeft = (length: number) => {
            markDirty()
            write(left(w(line.content.slice(line.cursor - length, line.cursor))))
            line.cursor -= length
        }
        const moveRight = (length: number) => {
            markDirty()
            write(right(w(line.content.slice(line.cursor, line.cursor + length))))
            line.cursor += length
        }
        const insert = (str: string) => {
            markDirty()
            const { after } = line
            line.content = line.before + str + after
            line.cursor += str.length
            write(str + after + back((w(after))))
        }

        const renderComp = (mapIndex: (compState: CompState) => number | null) => {
            const { term } = this
            const { compState } = line
            if (! compState || ! term) return

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
                    formatter: (str, i) => index === i ? chalk.black.bgWhiteBright(stripAnsi(str)) : str
                }) +
                hideCursor + '\r' + up(grid.rows + 1) + right(cursorX) + showCursor
            )
        }
        const clearComp = () => {
            const { compState } = line
            const { term } = this
            if (! compState || ! term) return

            const { display: { grid } } = compState

            const { cursorX } = term.buffer.active
            write(
                ('\n' + clear(term.cols)).repeat(grid.rows) +
                hideCursor + '\r' + up(grid.rows) + right(cursorX) + showCursor
            )
            line.compState = null
        }
        const getCandidate = () => {
            if (! line.compState) return null
            const { index, candidates } = line.compState
            if (index === null) return null
            return candidates[index]
        }
        const replaceCandidate = (target: string) => {
            let candidate: string
            if (line.compState) {
                const { index, candidates } = line.compState
                candidate = index === null ? '' : candidates[index]
            }
            else {
                candidate = ''
            }
            write(
                back(w(candidate)) +
                target + line.after +
                eraseAfter(Math.max(0, w(candidate) - w(target))) + back(w(line.after))
            )
        }
        const acceptComp = () => {
            const { index, candidates } = line.compState!
            if (index !== null) {
                const candidate = candidates[index]
                line.content = line.before + candidate + line.after
                line.cursor += candidate.length
            }
            clearComp()
        }
        const discardComp = () => {
            replaceCandidate('')
            clearComp()
        }
        const markDirty = () => {
            line.isDirty = true
            if (line.compState && line.compState.index !== null) {
                acceptComp()
            }
        }

        const abortEmitter = new AbortEmitter()
        this.proc.on('interrupt', () => abortEmitter.emit('abort'))

        while (true) {
            const data = await this.stdio.readKey({ abortEmitter })

            if (data === '\x03') { // Ctrl + C
                if (line.compState) {
                    discardComp()
                    continue
                }

                write('\n')
                line.content = ''
                line.cursor = 0
                return '\x03'
            }

            if (data === '\x04') { // Ctrl + D, EOF
                if (! line.content) return data
            }
            else if (data === '\r') { // Enter
                if (line.compState) {
                    acceptComp()
                    continue
                }

                write('\n')
                const { content } = line
                if (history && content.trim()) {
                    history.commit()
                }
                return content
            }
            else if (data === '\x1B') { // Escape
                if (line.compState) {
                    discardComp()
                    continue
                }
            }
            else if (data === '\x7F' || data === '\x08') { // Backspace / Ctrl + H
                if (line.cursor) kill(1)
            }
            else if (data === '\t' || data === '\x1B[Z') { // Tab / Shift + Tab
                const dir = data === '\t' ? + 1 : - 1

                if (useCompleton) {
                    const isNew = ! line.compState
                        || ! equalBy(line, line.compState.source, [ 'content', 'cursor' ])
                    if (isNew) {
                        const candidates = onComp(line)

                        clearComp()

                        if (! candidates.length) {
                            line.compState = null
                            continue
                        }

                        const commonPrefix = getCommonPrefix(candidates.map(prop('value')))
                        if (commonPrefix) {
                            insert(commonPrefix)
                            continue
                        }

                        const grid = new GridDisplay(
                            this.term,
                            candidates.map(prop('display')),
                            { useEqualWidth: true }
                        )
                        line.compState = {
                            source: pick(line, [ 'content', 'cursor' ]),
                            index: null,
                            display: {
                                type: 'grid',
                                grid,
                            },
                            candidates: candidates.map(prop('value')),
                            length: candidates.length,
                        }
                    }

                    renderComp(({ index, length }) => {
                        if (isNew) return index
                        if (index === null) return dir === 1 ? 0 : length - 1
                        else return (index + dir).mod(length)
                    })
                }
            }
            else if (data === '\x1B[A') { // Up
                if (line.compState) {
                    renderComp(({ index, length }) =>
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
                    renderComp(({ index, length }) =>
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
                if (line.compState?.index != null) {
                    renderComp(({ index, length, display: { grid: { cols, rows } } }) => {
                        let [ row, col ] = index!.remDiv(rows)
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
                if (line.compState?.index != null) {
                    renderComp(({ index, length, display: { grid: { rows, cols } } }) => {
                        const lastColHeight = length % rows || rows
                        let [ row, col ] = index!.remDiv(rows)
                        col --
                        if (col < 0) {
                            row = (row - 1).mod(rows)
                            col = cols - 1 - (row < lastColHeight ? 0 : 1)
                        }
                        return col * rows + row
                    })
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
                if (line.compState) {
                    continue
                }
                if (line.before) markDirty()
                write(left(w(line.before)))
                line.cursor = 0
            }
            else if (data === '\x05') { // Ctrl + E
                if (line.compState) {
                    continue
                }
                if (line.after) markDirty()
                write(right(w(line.after)))
                line.cursor = line.content.length
            }
            else if (data === '\x0C') { // Ctrl + L
                if (onBeforeClear?.()) continue
                this.stdio.write(hideCursor + clearScreen)
                onClear?.()
                const { after } = line
                write(line.before + (getCandidate() ?? '') + after + back(w(after)) + showCursor)
                if (line.compState) {
                    setTimeout(() => renderComp(({ index }) => index), 0)
                }
            }
            else if (data === '\x15') { // Ctrl + U
                markDirty()
                write(rewrite(''))
                line.content = ''
                line.cursor = 0
            }
            else {
                if (data.charCodeAt(0) < 32) {
                    console.debug(JSON.stringify(data), [ ...data ].map(c => c.charCodeAt(0)))
                    continue
                }
                insert(data)
            }
        }
    }

    async readLn(options: ReadlineReadLnOptions = {}) {
        if (this.isReadingLn) throw new Error('Already reading a line.')
        this.isReadingLn = true
        const doEcho = this.term.doEcho
        this.term.doEcho = false
        const line = await this._readLn(options)
        this.term.doEcho = doEcho
        this.isReadingLn = false
        return line
    }

    loopHandle: ReadlineLoopHandle | null = null

    createLoop(options: ReadlineLoopOptionsInit) {
        if (this.loopHandle) throw new Error('Loop already exists')
        return this.loopHandle = new ReadlineLoopHandle(this, options)
    }
}

export interface ReadlineLoopOptions extends StrictPick<ReadlineReadLnOptions, 'onComp'> {
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
                    onComp: this.options.onComp,
                    onClear: () => this.writePrompt(),
                }),
                this.toStop.promise,
            ])
            if (line === null) {
                if (this.options.onInterrupt?.()) continue
                break
            }
            if (! line.trim()) continue
            await this.options.onLine?.(line)
            if (this.toStop.triggered) break
        }
    }
}