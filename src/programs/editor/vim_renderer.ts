import type { TerminalSession } from '@/sys0/terminal_session'
import type { TextBuffer, TextRange } from './text_buffer'
import { VIM_HELP } from './vim_help'
import { lineNumber, numberWidth } from './line_numbers'

const HIDE_CURSOR = '\x1B[?25l'
const HOME = '\x1B[H'
const INVERSE = '\x1B[7m'
const BLUE = '\x1B[34m'
const RESET = '\x1B[0m'
const CURRENT_LINE = '\x1B[48;5;236m'
const TAB_SIZE = 4

interface DisplayCell {
  text: string
  width: number
  sourceStart: number
}

export type VimMode = 'normal' | 'insert' | 'command'

export interface VimRenderState {
  mode: VimMode
  filename?: string
  modified?: boolean
  command?: string
  commandPrefix?: ':' | '/' | '?'
  message?: string
  help?: boolean
  welcome?: boolean
  searchHighlight?: TextRange
  searchHighlights?: TextRange[]
  number?: boolean
  wrap?: boolean
  cursorline?: boolean
}

const controlCharacter = (char: string) => {
  const code = char.charCodeAt(0)
  if (code === 0x7F) return '^?'
  if (code < 0x20) return `^${String.fromCharCode(code + 64)}`
  return null
}

export class VimRenderer {
  private topRow = 0
  private leftColumn = 0
  private helpTopRow = 0
  private topWrappedRow = 0

  constructor(
    private readonly session: TerminalSession,
    private readonly buffer: TextBuffer,
  ) {}

  private get term() {
    return this.session.term
  }

  private cellsFor(value: string) {
    const cells: DisplayCell[] = []
    let column = 0
    let sourceOffset = 0
    for (const char of Array.from(value)) {
      const sourceStart = sourceOffset
      sourceOffset += char.length
      if (char === '\t') {
        const width = TAB_SIZE - column % TAB_SIZE
        cells.push({ text: ' '.repeat(width), width, sourceStart })
        column += width
        continue
      }
      const control = controlCharacter(char)
      cells.push({
        text: control ?? char,
        width: control ? 2 : this.term.getStringWidth(char),
        sourceStart,
      })
      column += cells.at(- 1) !.width
    }
    return cells
  }

  private widthOf(value: string) {
    return this.cellsFor(value).reduce((width, cell) => width + cell.width, 0)
  }

  private line(value: string, left: number, width: number, cursor?: number, highlights: { start: number, end: number }[] = []) {
    let position = 0
    let outputWidth = 0
    let output = ''
    for (const cell of this.cellsFor(value)) {
      const begin = position
      const end = begin + cell.width
      position = end
      if (end <= left) continue
      const clipped = begin < left || end > left + width
      const text = clipped
        ? ' '.repeat(Math.max(0, Math.min(end, left + width) - Math.max(begin, left)))
        : cell.text
      const cellWidth = clipped ? this.term.getStringWidth(text) : cell.width
      if (begin >= left + width) break
      if (outputWidth + cellWidth > width) break
      const matched = highlights.some(highlight => cell.sourceStart >= highlight.start && cell.sourceStart < highlight.end)
      const style = cursor === cell.sourceStart ? matched ? '\x1B[4;30;43m' : INVERSE : matched ? '\x1B[30;43m' : ''
      output += style ? style + text + RESET : text
      outputWidth += cellWidth
    }
    if (
      cursor === value.length
      && position >= left
      && position < left + width
      && outputWidth < width
    ) {
      output += INVERSE + ' ' + RESET
      outputWidth ++
    }
    return output + ' '.repeat(Math.max(0, width - outputWidth))
  }

  private plainLine(value: string, width: number, left = 0) {
    return this.line(value.replace(/[\n\r]/gu, ''), left, width)
  }

  private ensureCursorVisible(pageRows: number, columns: number) {
    const { row, column } = this.buffer.cursor
    if (row < this.topRow) this.topRow = row
    else if (row >= this.topRow + pageRows) this.topRow = row - pageRows + 1

    const line = this.buffer.getLine(row)
    const displayColumn = this.widthOf(line.slice(0, column))
    const cursorWidth = Math.max(1, this.cellsFor(line).find(cell => cell.sourceStart === column)?.width ?? 1)
    if (displayColumn < this.leftColumn) this.leftColumn = displayColumn
    else if (displayColumn + cursorWidth > this.leftColumn + columns) {
      this.leftColumn = displayColumn + Math.min(cursorWidth, columns) - columns
    }
  }

  private status(state: VimRenderState, columns: number) {
    if (state.mode === 'command') {
      const command = `${state.commandPrefix ?? ':'}${state.command ?? ''}`
      const cursor = command.length
      const width = this.widthOf(command)
      return this.line(command, Math.max(0, width - columns + 1), columns, cursor)
    }
    if (state.message) return this.plainLine(state.message, columns)
    if (state.mode === 'insert') return this.plainLine('-- INSERT --', columns)
    if (! state.filename) return ' '.repeat(columns)
    const modified = state.modified ? ' [+]' : ''
    const content = this.buffer.content
    const lineCount = content ? this.buffer.lineCount - (content.endsWith('\n') ? 1 : 0) : 0
    const bytes = new TextEncoder().encode(content).length
    return this.plainLine(`"${state.filename}"${modified} ${lineCount}L, ${bytes}B`, columns)
  }

  get pageRows() {
    return Math.max(1, this.term.rows - 1)
  }

  private helpLines() {
    const columns = Math.max(1, this.term.cols)
    return VIM_HELP.flatMap(line => line.match(new RegExp(`.{1,${columns}}`, 'gu')) ?? [''])
  }

  scrollHelp(offset: number) {
    this.helpTopRow = Math.max(0, Math.min(
      Math.max(0, this.helpLines().length - this.pageRows),
      this.helpTopRow + offset,
    ))
  }

  private wrappedRows(columns: number) {
    const screen: { row: number, left: number, width: number, cursor: boolean }[] = []
    for (let row = 0; row < this.buffer.lineCount; row ++) {
      const line = this.buffer.getLine(row)
      const segments: { left: number, width: number }[] = []
      let position = 0
      let left = 0
      let used = 0
      const flush = () => {
        segments.push({ left, width: used })
        left = position
        used = 0
      }
      for (const cell of this.cellsFor(line)) {
        if (used && used + cell.width > columns && cell.width <= columns) flush()
        let remaining = cell.width
        while (remaining > 0) {
          if (used === columns) flush()
          const take = Math.min(remaining, columns - used)
          position += take
          used += take
          remaining -= take
        }
      }
      flush()
      const cursorColumn = row === this.buffer.cursor.row
        ? this.widthOf(line.slice(0, this.buffer.cursor.column)) : - 1
      if (cursorColumn === position && segments.at(- 1) !.width === columns) {
        segments.push({ left: position, width: 0 })
      }
      segments.at(- 1) !.width = columns
      segments.forEach((segment, index) => screen.push({
        row, ...segment,
        cursor: cursorColumn >= segment.left && (index === segments.length - 1 || cursorColumn < segments[index + 1].left),
      }))
    }
    return screen
  }

  movePage(direction: number, wrap: boolean, numbers: boolean) {
    if (! wrap) {
      this.buffer.moveVertical(direction * this.pageRows)
      return
    }
    const columns = Math.max(1, this.term.cols)
    const screen = this.wrappedRows(columns - numberWidth(numbers, this.buffer.lineCount, columns))
    const current = Math.max(0, screen.findIndex(line => line.cursor))
    const target = screen[Math.max(0, Math.min(screen.length - 1, current + direction * this.pageRows))]
    const line = this.buffer.getLine(target.row)
    let position = 0
    let offset = line.length
    for (const cell of this.cellsFor(line)) {
      if (position >= target.left) {
        offset = cell.sourceStart
        break
      }
      position += cell.width
    }
    this.buffer.moveTo(target.row, Array.from(line.slice(0, offset)).length)
  }

  render(state: VimRenderState) {
    const rows = Math.max(1, this.term.rows)
    const columns = Math.max(1, this.term.cols)
    const pageRows = Math.max(1, rows - 1)
    if (state.welcome) {
      const welcome = [
        'HumanOS vim',
        '',
        'i  start editing     Esc  Normal mode',
        ':w FILE  save        :q  quit',
        ':help  commands and motions',
      ]
      const visible = welcome.slice(0, Math.max(0, rows - 1))
      const top = Math.floor((Math.max(0, rows - 1) - visible.length) / 2)
      const lines = Array.from({ length: Math.max(0, rows - 1) }, (_, row) => {
        const text = visible[row - top] ?? ''
        const padding = Math.max(0, Math.floor((columns - this.widthOf(text)) / 2))
        return this.plainLine(' '.repeat(padding) + text, columns)
      })
      lines.push(this.status(state, columns))
      this.session.write(HIDE_CURSOR + HOME + lines.join('\r\n'))
      return
    }
    if (state.help) {
      this.scrollHelp(0)
      const help = this.helpLines()
      const lines = Array.from({ length: Math.max(0, rows - 1) }, (_, index) => (
        this.plainLine(help[this.helpTopRow + index] ?? '', columns)
      ))
      lines.push(this.plainLine('Esc/q: Return  PgUp/PgDn: Scroll', columns))
      this.session.write(HIDE_CURSOR + HOME + lines.join('\r\n'))
      return
    }
    const gutter = numberWidth(!! state.number, this.buffer.lineCount, columns)
    const textColumns = columns - gutter
    const wrapped = state.wrap ? this.wrappedRows(textColumns) : undefined
    if (wrapped) {
      const cursor = wrapped.findIndex(line => line.cursor)
      this.topWrappedRow = Math.max(0, Math.min(this.topWrappedRow, wrapped.length - pageRows))
      if (cursor < this.topWrappedRow) this.topWrappedRow = cursor
      else if (cursor >= this.topWrappedRow + pageRows) this.topWrappedRow = cursor - pageRows + 1
    }
    else this.ensureCursorVisible(pageRows, textColumns)
    const lines = Array.from({ length: pageRows }, (_, index) => {
      const segment = wrapped?.[this.topWrappedRow + index]
      const row = wrapped ? segment?.row ?? this.buffer.lineCount : this.topRow + index
      if (row >= this.buffer.lineCount) {
        return BLUE + this.plainLine('~', columns) + RESET
      }
      const highlights = (state.searchHighlights ?? (state.searchHighlight ? [state.searchHighlight] : []))
        .filter(range => row >= range.start.row && row <= range.end.row)
        .map(range => ({
          start: row === range.start.row ? range.start.column : 0,
          end: row === range.end.row ? range.end.column : this.buffer.getLine(row).length,
        }))
      const width = segment?.width ?? textColumns
      const hasCursor = segment ? segment.cursor : row === this.buffer.cursor.row
      const active = row === this.buffer.cursor.row
      const rendered = lineNumber(segment && segment.left > 0 ? undefined : row, gutter, active) + this.line(
        this.buffer.getLine(row),
        segment?.left ?? this.leftColumn,
        width,
        state.mode !== 'command' && hasCursor ? this.buffer.cursor.column : undefined,
        highlights,
      ) + ' '.repeat(textColumns - width)
      // Search/cursor styles take priority locally; restore the row background
      // after each reset so it also covers ordinary text and trailing padding.
      return active && state.cursorline !== false
        ? CURRENT_LINE + rendered.replaceAll(RESET, RESET + CURRENT_LINE) + RESET
        : rendered
    })
    if (rows === 1) lines.length = 0
    lines.push(this.status(state, columns))
    this.session.write(HIDE_CURSOR + HOME + lines.slice(0, rows).join('\r\n'))
  }
}
