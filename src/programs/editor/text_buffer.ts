export interface EditorCursor {
  row: number
  column: number
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
  const previous = codePoints(value.slice(0, offset)).at(- 1)
  return offset - (previous?.length ?? 0)
}

const nextOffset = (value: string, offset: number) => {
  const next = codePoints(value.slice(offset))[0]
  return offset + (next?.length ?? 0)
}

export class TextBuffer {
  private lines: string[]
  private readonly undoStack: BufferSnapshot[] = []
  private readonly redoStack: BufferSnapshot[] = []
  private preferredCharacter: number | null = null

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
    this.undoStack.push(before)
    this.redoStack.length = 0
    this.preferredCharacter = null
    return true
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
    let cut = ''
    this.mutate(() => {
      cut = this.getLine(this.cursor.row)
      if (this.lines.length === 1) this.lines[0] = ''
      else this.lines.splice(this.cursor.row, 1)
      this.cursor.row = Math.min(this.cursor.row, this.lines.length - 1)
      this.cursor.column = Math.min(this.cursor.column, this.getLine(this.cursor.row).length)
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
    const snapshot = this.undoStack.pop()
    if (! snapshot) return false
    this.redoStack.push(this.snapshot())
    this.restore(snapshot)
    return true
  }

  redo() {
    const snapshot = this.redoStack.pop()
    if (! snapshot) return false
    this.undoStack.push(this.snapshot())
    this.restore(snapshot)
    return true
  }
}
