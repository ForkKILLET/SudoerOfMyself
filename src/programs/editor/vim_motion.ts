import type { EditorCursor, TextBuffer } from './text_buffer'

export interface VimMotion {
  target: EditorCursor
  inclusive?: boolean
  linewise?: boolean
}

export const offsetOf = (buffer: TextBuffer, cursor: EditorCursor) => {
  let offset = cursor.column
  for (let row = 0; row < cursor.row; row ++) offset += buffer.getLine(row).length + 1
  return offset
}

export const positionOf = (content: string, offset: number): EditorCursor => {
  const lines = content.slice(0, offset).split('\n')
  return { row: lines.length - 1, column: lines.at(- 1) !.length }
}

const lastColumn = (line: string) => Math.max(0, line.length - (Array.from(line).at(- 1)?.length ?? 0))
const firstColumn = (line: string) => Math.min(lastColumn(line), /^\s*/u.exec(line) ![0].length)

export const resolveMotion = (
  buffer: TextBuffer, key: string, count = 1, explicitCount = false, character?: string,
): VimMotion | null => {
  const { row, column } = buffer.cursor
  const line = buffer.getLine(row)
  const target = { row, column }
  const result: VimMotion = { target }
  const rowAt = (value: number) => Math.max(0, Math.min(buffer.lineCount - 1, value))
  switch (key) {
    case 'h': case 'left': case 'backspace':
      target.column = Array.from(line).slice(0, Math.max(0, buffer.characterColumn - count)).join('').length
      break
    case 'l': case 'right':
      target.column = Array.from(line).slice(0, buffer.characterColumn + count).join('').length
      break
    case 'j': case 'down': case 'k': case 'up':
      target.row = rowAt(row + (key === 'j' || key === 'down' ? count : - count))
      if (target.row === row) return null
      target.column = Array.from(buffer.getLine(target.row)).slice(0, buffer.characterColumn).join('').length
      result.linewise = true
      break
    case '0': case 'home':
      target.column = 0
      break
    case '^':
      target.column = firstColumn(line)
      break
    case '$': case 'end':
      target.row = rowAt(row + count - 1)
      target.column = lastColumn(buffer.getLine(target.row))
      result.inclusive = true
      break
    case 'gg': case 'file-start': case 'G': case 'file-end':
      target.row = explicitCount ? rowAt(count - 1) : key === 'gg' || key === 'file-start' ? 0 : buffer.lineCount - 1
      target.column = firstColumn(buffer.getLine(target.row))
      result.linewise = true
      break
    case 'w': case 'W': case 'b': case 'B': case 'e': case 'E': {
      const content = buffer.content
      const characters = Array.from(content)
      let index = Array.from(content.slice(0, offsetOf(buffer, buffer.cursor))).length
      const kind = (at: number) => {
        const char = characters[at] ?? '\n'
        return /\s/u.test(char) ? 0 : key === key.toUpperCase() || /[\p{L}\p{N}_]/u.test(char) ? 1 : 2
      }
      for (let n = 0; n < count; n ++) {
        if (key.toLowerCase() === 'w') {
          const initial = kind(index)
          while (index < characters.length && kind(index) === initial) index ++
          while (index < characters.length && kind(index) === 0) index ++
        }
        else if (key.toLowerCase() === 'b') {
          index = Math.max(0, index - 1)
          while (index > 0 && kind(index) === 0) index --
          const initial = kind(index)
          while (index > 0 && kind(index - 1) === initial) index --
        }
        else {
          index = Math.min(characters.length, index + 1)
          while (index < characters.length && kind(index) === 0) index ++
          const initial = kind(index)
          while (index + 1 < characters.length && kind(index + 1) === initial) index ++
          result.inclusive = true
        }
      }
      Object.assign(target, positionOf(content, characters.slice(0, index).join('').length))
      break
    }
    case 'f': case 'F': case 't': case 'T': {
      if (! character) return null
      const characters = Array.from(line)
      const direction = key === key.toLowerCase() ? 1 : - 1
      let index = buffer.characterColumn
      for (let n = 0; n < count; n ++) {
        do {
          index += direction
        }
        while (index >= 0 && index < characters.length && characters[index] !== character)
        if (index < 0 || index >= characters.length) return null
      }
      if (key.toLowerCase() === 't') index -= direction
      target.column = characters.slice(0, index).join('').length
      result.inclusive = direction === 1
      break
    }
    case '%': {
      if (explicitCount) {
        if (count > 100) return null
        target.row = rowAt(Math.ceil(buffer.lineCount * count / 100) - 1)
        target.column = firstColumn(buffer.getLine(target.row))
        result.linewise = true
        break
      }
      const pairs = '()[]{}'
      const begin = line.slice(column).search(/[()[\]{}]/u)
      if (begin === - 1) return null
      const start = offsetOf(buffer, { row, column: column + begin })
      const content = buffer.content
      const pair = pairs.indexOf(content[start])
      const direction = pair % 2 === 0 ? 1 : - 1
      const counterpart = pairs[pair + direction]
      let depth = 1
      let offset = start
      while (depth) {
        offset += direction
        if (offset < 0 || offset >= content.length) return null
        if (content[offset] === content[start]) depth ++
        else if (content[offset] === counterpart) depth --
      }
      Object.assign(target, positionOf(content, offset))
      result.inclusive = true
      break
    }
    default: return null
  }
  return result
}
