export interface EditorCursor {
  row: number
  column: number
}

export interface TextRange {
  start: EditorCursor
  end: EditorCursor
}

export interface TextSearchResult {
  range: TextRange
  wrapped: boolean
}

interface BufferSnapshot {
  content: string
  cursor: EditorCursor
}

const codePoints = (value: string) => Array.from(value)

const offsetAtCharacter = (value: string, character: number) => (
  codePoints(value).slice(0, character).join('').length
)

const characterAtOffset = (value: string, offset: number) => (
  codePoints(value.slice(0, offset)).length
)

const previousOffset = (value: string, offset: number) => {
  if (offset <= 0) return 0
  const last = value.charCodeAt(offset - 1)
  const before = value.charCodeAt(offset - 2)
  const pair = last >= 0xDC00 && last <= 0xDFFF && before >= 0xD800 && before <= 0xDBFF
  return offset - (pair ? 2 : 1)
}

const nextOffset = (value: string, offset: number) => {
  const next = value.codePointAt(offset)
  return offset + (next === undefined ? 0 : next > 0xFFFF ? 2 : 1)
}

const compareCursor = (left: EditorCursor, right: EditorCursor) => (
  left.row - right.row || left.column - right.column
)

export class TextBuffer {
  private lines: string[]
  private readonly undoStack: BufferSnapshot[] = []
  private readonly redoStack: BufferSnapshot[] = []
  private preferredCharacter: number | null = null
  private undoGroup: { before: BufferSnapshot, recorded: boolean } | null = null

  readonly cursor: EditorCursor = { row: 0, column: 0 }

  constructor(content = '') {
    this.lines = content.split('\n')
  }

  get lineCount() {
    return this.lines.length
  }

  get content() {
    return this.lines.join('\n')
  }

  getLine(row: number) {
    return this.lines[row] ?? ''
  }

  get characterColumn() {
    return characterAtOffset(this.getLine(this.cursor.row), this.cursor.column)
  }

  moveTo(row: number, character = 0) {
    this.cursor.row = Math.max(0, Math.min(this.lineCount - 1, row))
    this.cursor.column = offsetAtCharacter(this.getLine(this.cursor.row), Math.max(0, character))
    this.preferredCharacter = null
  }

  moveToFileStart() {
    this.moveTo(0)
  }

  moveToFileEnd() {
    this.moveTo(this.lineCount - 1)
    this.moveToLineEnd()
  }

  private offsetAtPosition(position: EditorCursor) {
    return this.lines.slice(0, position.row)
      .reduce((sum, line) => sum + line.length + 1, 0) + position.column
  }

  private get cursorOffset() {
    return this.offsetAtPosition(this.cursor)
  }

  private positionAtOffset(offset: number): EditorCursor {
    const before = this.content.slice(0, offset).split('\n')
    return {
      row: before.length - 1,
      column: before.at(- 1) !.length,
    }
  }

  private moveToOffset(offset: number) {
    Object.assign(this.cursor, this.positionAtOffset(offset))
    this.preferredCharacter = null
  }

  rangeFrom(anchor: EditorCursor): TextRange {
    const cursor = { ...this.cursor }
    const mark = { ...anchor }
    return compareCursor(mark, cursor) <= 0
      ? { start: mark, end: cursor }
      : { start: cursor, end: mark }
  }

  textInRange(range: TextRange) {
    return this.content.slice(
      this.offsetAtPosition(range.start),
      this.offsetAtPosition(range.end),
    )
  }

  cutRange(range: TextRange) {
    const start = this.offsetAtPosition(range.start)
    const end = this.offsetAtPosition(range.end)
    const cut = this.content.slice(start, end)
    if (! cut) return ''
    this.mutate(() => {
      const content = this.content
      this.lines = (content.slice(0, start) + content.slice(end)).split('\n')
      this.moveToOffset(start)
    })
    return cut
  }

  findNext(query: string, includeCurrent = false): TextSearchResult | null {
    if (! query) return null
    const content = this.content
    const offset = this.cursorOffset
    const start = includeCurrent ? offset : offset + 1
    let found = content.indexOf(query, start)
    const wrapped = found === - 1
    if (wrapped) found = content.indexOf(query)
    if (found === - 1) return null
    const range = {
      start: this.positionAtOffset(found),
      end: this.positionAtOffset(found + query.length),
    }
    this.moveToOffset(found)
    return { range, wrapped }
  }

  moveWord(direction: - 1 | 1) {
    const content = this.content
    let offset = this.cursorOffset
    const isWord = (char: string) => /[\p{L}\p{N}_]/u.test(char)
    if (direction === 1) {
      while (offset < content.length && isWord(String.fromCodePoint(content.codePointAt(offset) !))) {
        offset = nextOffset(content, offset)
      }
      while (offset < content.length && ! isWord(String.fromCodePoint(content.codePointAt(offset) !))) {
        offset = nextOffset(content, offset)
      }
    }
    else {
      while (offset > 0 && ! isWord(content.slice(previousOffset(content, offset), offset))) {
        offset = previousOffset(content, offset)
      }
      while (offset > 0 && isWord(content.slice(previousOffset(content, offset), offset))) {
        offset = previousOffset(content, offset)
      }
    }
    this.moveToOffset(offset)
  }

  private snapshot(): BufferSnapshot {
    return { content: this.content, cursor: { ...this.cursor } }
  }

  private restore(snapshot: BufferSnapshot) {
    this.lines = snapshot.content.split('\n')
    this.cursor.row = snapshot.cursor.row
    this.cursor.column = snapshot.cursor.column
    this.preferredCharacter = null
  }

  private mutate(change: () => void) {
    const before = this.snapshot()
    change()
    if (before.content === this.content) return false
    if (! this.undoGroup) this.undoStack.push(before)
    else if (! this.undoGroup.recorded) {
      this.undoStack.push(this.undoGroup.before)
      this.undoGroup.recorded = true
    }
    this.redoStack.length = 0
    this.preferredCharacter = null
    return true
  }

  beginUndoGroup() {
    this.undoGroup = { before: this.snapshot(), recorded: false }
  }

  endUndoGroup() {
    this.undoGroup = null
  }

  insert(value: string) {
    if (! value) return false
    return this.mutate(() => {
      const line = this.getLine(this.cursor.row)
      const before = line.slice(0, this.cursor.column)
      const after = line.slice(this.cursor.column)
      const inserted = value.replace(/\r\n?|\n/gu, '\n').split('\n')
      if (inserted.length === 1) {
        this.lines[this.cursor.row] = before + inserted[0] + after
        this.cursor.column += inserted[0].length
        return
      }
      const replacement = [
        before + inserted[0],
        ...inserted.slice(1, - 1),
        inserted.at(- 1) ! + after,
      ]
      this.lines.splice(this.cursor.row, 1, ...replacement)
      this.cursor.row += replacement.length - 1
      this.cursor.column = inserted.at(- 1) !.length
    })
  }

  backspace() {
    if (this.cursor.row === 0 && this.cursor.column === 0) return false
    return this.mutate(() => {
      const line = this.getLine(this.cursor.row)
      if (this.cursor.column > 0) {
        const begin = previousOffset(line, this.cursor.column)
        this.lines[this.cursor.row] = line.slice(0, begin) + line.slice(this.cursor.column)
        this.cursor.column = begin
        return
      }
      const previous = this.getLine(this.cursor.row - 1)
      this.lines[this.cursor.row - 1] = previous + line
      this.lines.splice(this.cursor.row, 1)
      this.cursor.row --
      this.cursor.column = previous.length
    })
  }

  deleteForward() {
    const line = this.getLine(this.cursor.row)
    if (this.cursor.row === this.lines.length - 1 && this.cursor.column === line.length) return false
    return this.mutate(() => {
      if (this.cursor.column < line.length) {
        const end = nextOffset(line, this.cursor.column)
        this.lines[this.cursor.row] = line.slice(0, this.cursor.column) + line.slice(end)
        return
      }
      this.lines[this.cursor.row] = line + this.getLine(this.cursor.row + 1)
      this.lines.splice(this.cursor.row + 1, 1)
    })
  }

  cutLine() {
    if (! this.content) return ''
    let cut = ''
    this.mutate(() => {
      cut = this.getLine(this.cursor.row)
      if (this.lines.length === 1) this.lines[0] = ''
      else this.lines.splice(this.cursor.row, 1)
      this.cursor.row = Math.min(this.cursor.row, this.lines.length - 1)
      this.cursor.column = 0
    })
    return cut + '\n'
  }

  moveLeft() {
    const line = this.getLine(this.cursor.row)
    if (this.cursor.column > 0) this.cursor.column = previousOffset(line, this.cursor.column)
    else if (this.cursor.row > 0) {
      this.cursor.row --
      this.cursor.column = this.getLine(this.cursor.row).length
    }
    this.preferredCharacter = null
  }

  moveRight() {
    const line = this.getLine(this.cursor.row)
    if (this.cursor.column < line.length) this.cursor.column = nextOffset(line, this.cursor.column)
    else if (this.cursor.row < this.lines.length - 1) {
      this.cursor.row ++
      this.cursor.column = 0
    }
    this.preferredCharacter = null
  }

  moveVertical(offset: number) {
    this.preferredCharacter ??= characterAtOffset(
      this.getLine(this.cursor.row),
      this.cursor.column,
    )
    this.cursor.row = Math.max(0, Math.min(this.lines.length - 1, this.cursor.row + offset))
    this.cursor.column = offsetAtCharacter(
      this.getLine(this.cursor.row),
      this.preferredCharacter,
    )
  }

  moveToLineStart() {
    this.cursor.column = 0
    this.preferredCharacter = null
  }

  moveToLineEnd() {
    this.cursor.column = this.getLine(this.cursor.row).length
    this.preferredCharacter = null
  }

  undo() {
    this.endUndoGroup()
    const snapshot = this.undoStack.pop()
    if (! snapshot) return false
    this.redoStack.push(this.snapshot())
    this.restore(snapshot)
    return true
  }

  redo() {
    this.endUndoGroup()
    const snapshot = this.redoStack.pop()
    if (! snapshot) return false
    this.undoStack.push(this.snapshot())
    this.restore(snapshot)
    return true
  }
}
