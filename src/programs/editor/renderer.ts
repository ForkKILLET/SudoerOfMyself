import type { TerminalSession } from '@/sys0/terminal_session'
import type { TextBuffer, TextRange } from './text_buffer'
import {
  NANO_HELP,
  NANO_SHORTCUTS,
  type EditorShortcutSlot,
} from './nano_help'

const HIDE_CURSOR = '\x1B[?25l'
const HOME = '\x1B[H'
const INVERSE = '\x1B[7m'
const SEARCH_HIGHLIGHT = '\x1B[30;43m'
const SEARCH_CURSOR_HIGHLIGHT = '\x1B[4;30;43m'
const SELECTION_CURSOR_HIGHLIGHT = '\x1B[4;7m'
const ERROR_NOTICE = '\x1B[37;41m'
const WRAPPED_NOTICE = '\x1B[30;47m'
const RESET = '\x1B[0m'
const TAB_SIZE = 4

interface DisplayCell {
  text: string
  width: number
  sourceStart: number
  sourceEnd: number
}

interface LineHighlight {
  start: number
  end: number
  endOfLine?: boolean
}

type CellStyle = 'cursor' | 'search' | 'search-cursor' | 'selection' | 'selection-cursor' | null

export interface EditorPrompt {
  label: string
  value: string
  cursor?: number
  shortcuts?: readonly EditorShortcutSlot[]
  shortcutColumns?: number
  shortcutColumnWidth?: number
  shortcutPairs?: boolean
}

export interface EditorFooter {
  shortcuts: readonly EditorShortcutSlot[]
  shortcutColumns?: number
  shortcutColumnWidth?: number
  shortcutPairs?: boolean
}

export interface EditorNotice {
  text: string
  tone: 'error' | 'wrapped'
}

export interface EditorRenderState {
  filename?: string
  message?: string
  modified?: boolean
  prompt?: EditorPrompt
  help?: boolean
  notice?: EditorNotice
  searchHighlight?: TextRange
  selection?: TextRange
  footer?: EditorFooter
}

const controlCharacter = (char: string) => {
  const code = char.charCodeAt(0)
  if (code === 0x7F) return '^?'
  if (code < 0x20) return `^${String.fromCharCode(code + 64)}`
  return null
}

export class EditorRenderer {
  private topRow = 0
  private leftColumn = 0
  private helpTopRow = 0

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
        cells.push({ text: ' '.repeat(width), width, sourceStart, sourceEnd: sourceOffset })
        column += width
        continue
      }
      const control = controlCharacter(char)
      const text = control ?? char
      const width = control ? 2 : this.term.getStringWidth(char)
      cells.push({ text, width, sourceStart, sourceEnd: sourceOffset })
      column += width
    }
    return cells
  }

  private widthOf(value: string) {
    return this.cellsFor(value).reduce((width, cell) => width + cell.width, 0)
  }

  private cellStyle(
    highlighted: boolean,
    selected: boolean,
    cursor: boolean,
    selecting: boolean,
  ): CellStyle {
    if (highlighted) return cursor ? 'search-cursor' : 'search'
    if (selected) return cursor ? 'selection-cursor' : 'selection'
    if (cursor) return selecting ? 'selection-cursor' : 'cursor'
    return null
  }

  private sliceToWidth(
    value: string,
    left: number,
    width: number,
    highlight?: LineHighlight,
    cursor?: number,
    selection?: LineHighlight,
  ) {
    let position = 0
    let output = ''
    let outputWidth = 0
    let activeStyle: CellStyle = null
    const append = (text: string, style: CellStyle) => {
      if (style !== activeStyle) {
        if (activeStyle) output += RESET
        if (style === 'cursor') output += INVERSE
        else if (style === 'search') output += SEARCH_HIGHLIGHT
        else if (style === 'search-cursor') output += SEARCH_CURSOR_HIGHLIGHT
        else if (style === 'selection') output += INVERSE
        else if (style === 'selection-cursor') output += SELECTION_CURSOR_HIGHLIGHT
        activeStyle = style
      }
      output += text
    }
    for (const cell of this.cellsFor(value)) {
      const begin = position
      const end = begin + cell.width
      position = end
      if (end <= left) continue
      const highlighted = Boolean(
        highlight && cell.sourceEnd > highlight.start && cell.sourceStart < highlight.end,
      )
      const selected = Boolean(
        selection && cell.sourceEnd > selection.start && cell.sourceStart < selection.end,
      )
      const style = this.cellStyle(
        highlighted,
        selected,
        cursor === cell.sourceStart,
        Boolean(selection),
      )
      if (begin < left) {
        const overlap = Math.min(end - left, width - outputWidth)
        append(' '.repeat(Math.max(0, overlap)), style)
        outputWidth += Math.max(0, overlap)
        continue
      }
      if (outputWidth + cell.width > width) break
      append(cell.text, style)
      outputWidth += cell.width
    }
    const endOfLineVisible = position >= left
      && position < left + width
      && outputWidth < width
    if (cursor === value.length && endOfLineVisible) {
      append(' ', selection ? 'selection-cursor' : 'cursor')
      outputWidth ++
    }
    else if (selection?.endOfLine && endOfLineVisible) {
      append(' ', 'selection')
      outputWidth ++
    }
    if (activeStyle) output += RESET
    return output + ' '.repeat(Math.max(0, width - outputWidth))
  }

  private plainLine(value: string, width: number, left = 0) {
    return this.sliceToWidth(value.replace(/[\n\r]/gu, ''), left, width)
  }

  private footer(
    shortcuts: readonly EditorShortcutSlot[],
    rows: number,
    columns: number,
    maxColumns = Number.MAX_SAFE_INTEGER,
    paired = false,
    fixedColumnWidth?: number,
  ) {
    const minimumColumnWidth = Math.max(13, ...shortcuts.map(shortcut => shortcut
      ? Math.max(2, this.widthOf(shortcut.key)) + this.widthOf(` ${shortcut.label}`)
      : 0))
    const widthConstraint = fixedColumnWidth ?? minimumColumnWidth
    const gridColumns = Math.max(1, Math.min(maxColumns, Math.floor(columns / widthConstraint)))
    const columnWidth = Math.min(columns, fixedColumnWidth ?? Math.floor(columns / gridColumns))
    const desiredRows = paired
      ? Math.min(2, shortcuts.length)
      : Math.ceil(shortcuts.length / gridColumns)
    const gridRows = Math.min(desiredRows, Math.max(0, rows - 3))
    return Array.from({ length: gridRows }, (_, row) => {
      let line = ''
      for (let column = 0; column < gridColumns; column ++) {
        const index = paired
          ? column * 2 + row
          : column * gridRows + row
        const shortcut = shortcuts[index]
        if (! shortcut) {
          line += ' '.repeat(columnWidth)
          continue
        }
        const keyWidth = Math.min(this.widthOf(shortcut.key), columnWidth)
        const keyFieldWidth = Math.min(Math.max(2, keyWidth), columnWidth)
        const key = this.plainLine(shortcut.key, keyWidth)
        const padding = ' '.repeat(keyFieldWidth - keyWidth)
        const label = this.plainLine(
          ` ${shortcut.label}`,
          Math.max(0, columnWidth - keyFieldWidth),
        )
        line += INVERSE + padding + key + RESET + label
      }
      return line + ' '.repeat(Math.max(0, columns - gridColumns * columnWidth))
    })
  }

  get pageRows() {
    const rows = Math.max(1, this.term.rows)
    return Math.max(1, rows - 2 - this.footer(
      NANO_SHORTCUTS,
      rows,
      this.term.cols,
      Number.MAX_SAFE_INTEGER,
      true,
    ).length)
  }

  scrollHelp(delta: number) {
    this.helpTopRow = Math.max(0, this.helpTopRow + delta)
  }

  private helpLines(columns: number) {
    return NANO_HELP.flatMap((line) => {
      const width = this.widthOf(line)
      return Array.from({ length: Math.max(1, Math.ceil(width / columns)) }, (_, index) => (
        this.sliceToWidth(line, index * columns, columns)
      ))
    })
  }

  private renderHelp(rows: number, columns: number) {
    const footer = this.footer([
      { key: '^X', label: 'Back' },
      { key: '^Y', label: 'Prev Page' },
      { key: '^V', label: 'Next Page' },
    ], rows, columns)
    const pageRows = Math.max(1, rows - 2 - footer.length)
    const help = this.helpLines(columns)
    this.helpTopRow = Math.max(0, Math.min(this.helpTopRow, help.length - pageRows))
    const lines = [
      `${INVERSE}${this.plainLine('  HumanOS nano - Help', columns)}${RESET}`,
      ...Array.from({ length: pageRows }, (_, index) => (
        help[this.helpTopRow + index] ?? ' '.repeat(columns)
      )),
      `${INVERSE}${this.plainLine('^X / Escape: back to editor', columns)}${RESET}`,
      ...footer,
    ]
    this.session.write(HIDE_CURSOR + HOME + lines.slice(0, rows).join('\r\n'))
  }

  private ensureCursorVisible(contentRows: number, columns: number) {
    const { row, column } = this.buffer.cursor
    if (row < this.topRow) this.topRow = row
    else if (row >= this.topRow + contentRows) this.topRow = row - contentRows + 1

    const displayColumn = this.widthOf(this.buffer.getLine(row).slice(0, column))
    if (displayColumn < this.leftColumn) this.leftColumn = displayColumn
    else if (displayColumn >= this.leftColumn + columns) {
      this.leftColumn = displayColumn - columns + 1
    }
  }

  private header(state: EditorRenderState, columns: number) {
    const filename = state.filename ?? '[ New Buffer ]'
    const modified = state.modified ? 'Modified' : ''
    const prefix = `  HumanOS nano  ${filename}`
    const available = Math.max(1, columns - this.widthOf(modified) - 1)
    const left = this.plainLine(prefix, available)
    return this.plainLine(left + modified, columns)
  }

  private promptLine(prompt: EditorPrompt, columns: number) {
    const value = prompt.label + prompt.value
    const cursor = prompt.label.length + (prompt.cursor ?? prompt.value.length)
    const width = this.widthOf(value.slice(0, cursor))
    return this.sliceToWidth(value, Math.max(0, width - columns + 1), columns, undefined, cursor)
  }

  private lineHighlight(range: TextRange | undefined, row: number, lineLength: number) {
    if (! range || row < range.start.row || row > range.end.row) return undefined
    const start = row === range.start.row ? range.start.column : 0
    const end = row === range.end.row ? range.end.column : lineLength
    const endOfLine = row < range.end.row
    return { start, end, endOfLine }
  }

  private noticeLine(notice: EditorNotice, columns: number) {
    const width = Math.min(columns, this.widthOf(notice.text))
    const text = this.plainLine(notice.text, width)
    const left = Math.floor((columns - width) / 2)
    const right = columns - left - width
    const style = notice.tone === 'error' ? ERROR_NOTICE : WRAPPED_NOTICE
    return ' '.repeat(left) + style + text + RESET + ' '.repeat(right)
  }

  render(state: EditorRenderState = {}) {
    const rows = Math.max(1, this.term.rows)
    const columns = Math.max(1, this.term.cols)
    if (state.help) {
      this.renderHelp(rows, columns)
      return
    }
    const shortcutLayout = state.prompt ?? state.footer
    const shortcuts = shortcutLayout?.shortcuts ?? NANO_SHORTCUTS
    const footer = this.footer(
      shortcuts,
      rows,
      columns,
      shortcutLayout?.shortcutColumns,
      shortcutLayout?.shortcutPairs ?? shortcuts === NANO_SHORTCUTS,
      shortcutLayout?.shortcutColumnWidth,
    )
    const contentRows = Math.max(1, rows - 2 - footer.length)
    this.ensureCursorVisible(contentRows, columns)
    const lines: string[] = []

    lines.push(`${INVERSE}${this.header(state, columns)}${RESET}`)
    for (let index = 0; index < contentRows; index ++) {
      const row = this.topRow + index
      const line = this.buffer.getLine(row)
      lines.push(row < this.buffer.lineCount
        ? this.sliceToWidth(
            line,
            this.leftColumn,
            columns,
            this.lineHighlight(state.searchHighlight, row, line.length),
            row === this.buffer.cursor.row ? this.buffer.cursor.column : undefined,
            this.lineHighlight(state.selection, row, line.length),
          )
        : ' '.repeat(columns))
    }

    if (state.prompt) lines.push(this.promptLine(state.prompt, columns))
    else if (state.notice) lines.push(this.noticeLine(state.notice, columns))
    else if (state.message) lines.push(`${INVERSE}${this.plainLine(state.message, columns)}${RESET}`)
    else lines.push(' '.repeat(columns))
    lines.push(...footer)

    this.session.write(
      HIDE_CURSOR
      + HOME
      + lines.slice(0, rows).join('\r\n'),
    )
  }
}
