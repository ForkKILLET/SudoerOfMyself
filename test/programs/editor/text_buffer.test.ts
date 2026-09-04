import { describe, expect, it } from 'vitest'
import { TextBuffer } from '@/programs/editor/text_buffer'

describe('editor text buffer', () => {
  it('inserts, splits, joins, and deletes lines', () => {
    const buffer = new TextBuffer('one\ntwo')
    buffer.moveToLineEnd()
    buffer.insert('\nnew')

    expect(buffer.content).toBe('one\nnew\ntwo')
    expect(buffer.cursor).toEqual({ row: 1, column: 3 })

    buffer.deleteForward()
    expect(buffer.content).toBe('one\nnewtwo')
    buffer.moveToLineStart()
    buffer.backspace()
    expect(buffer.content).toBe('onenewtwo')
  })

  it('moves and deletes by Unicode code point rather than UTF-16 code unit', () => {
    const buffer = new TextBuffer('a😀b\n短')
    buffer.moveToLineEnd()
    buffer.moveLeft()
    buffer.backspace()

    expect(buffer.content).toBe('ab\n短')
    expect(buffer.cursor).toEqual({ row: 0, column: 1 })

    buffer.moveVertical(1)
    expect(buffer.cursor).toEqual({ row: 1, column: 1 })
  })

  it('preserves the preferred column while moving across short lines', () => {
    const buffer = new TextBuffer('abcdef\nx\n123456')
    buffer.moveToLineEnd()
    buffer.moveVertical(1)
    expect(buffer.cursor).toEqual({ row: 1, column: 1 })
    buffer.moveVertical(1)
    expect(buffer.cursor).toEqual({ row: 2, column: 6 })
  })

  it('supports undo and redo for editing operations', () => {
    const buffer = new TextBuffer('hello')
    buffer.moveToLineEnd()
    buffer.insert(' world')
    buffer.backspace()

    expect(buffer.content).toBe('hello worl')
    expect(buffer.undo()).toBe(true)
    expect(buffer.content).toBe('hello world')
    expect(buffer.undo()).toBe(true)
    expect(buffer.content).toBe('hello')
    expect(buffer.redo()).toBe(true)
    expect(buffer.content).toBe('hello world')
  })

  it('searches literally, repeats with wrapping, and leaves the cursor on a miss', () => {
    const buffer = new TextBuffer('a.b😀\na.b')
    expect(buffer.findNext('a.b', true)).toEqual({
      range: { start: { row: 0, column: 0 }, end: { row: 0, column: 3 } },
      wrapped: false,
    })
    expect(buffer.cursor).toEqual({ row: 0, column: 0 })
    expect(buffer.findNext('a.b')).toEqual({
      range: { start: { row: 1, column: 0 }, end: { row: 1, column: 3 } },
      wrapped: false,
    })
    expect(buffer.cursor).toEqual({ row: 1, column: 0 })
    expect(buffer.findNext('a.b')).toEqual({
      range: { start: { row: 0, column: 0 }, end: { row: 0, column: 3 } },
      wrapped: true,
    })
    expect(buffer.cursor).toEqual({ row: 0, column: 0 })
    expect(buffer.findNext('missing')).toBeNull()
    expect(buffer.cursor).toEqual({ row: 0, column: 0 })
  })

  it('navigates characters and words without splitting surrogate pairs', () => {
    const buffer = new TextBuffer('😀世界 next\nlast')
    buffer.moveTo(0, 2)
    expect(buffer.cursor.column).toBe(3)
    expect(buffer.characterColumn).toBe(2)
    buffer.moveWord(1)
    expect(buffer.cursor.column).toBe(5)
    buffer.moveWord(- 1)
    expect(buffer.cursor.column).toBe(2)
    buffer.moveTo(999, 999)
    expect(buffer.cursor).toEqual({ row: 1, column: 4 })
    buffer.moveToFileStart()
    expect(buffer.cursor).toEqual({ row: 0, column: 0 })
  })

  it('reads and cuts marked ranges in either direction', () => {
    const buffer = new TextBuffer('a😀b\n短line')
    buffer.moveTo(0, 1)
    const range = buffer.rangeFrom({ row: 1, column: 1 })

    expect(range).toEqual({
      start: { row: 0, column: 1 },
      end: { row: 1, column: 1 },
    })
    expect(buffer.textInRange(range)).toBe('😀b\n短')
    expect(buffer.cutRange(range)).toBe('😀b\n短')
    expect(buffer.content).toBe('aline')
    expect(buffer.cursor).toEqual({ row: 0, column: 1 })
    expect(buffer.undo()).toBe(true)
    expect(buffer.content).toBe('a😀b\n短line')
  })
})
