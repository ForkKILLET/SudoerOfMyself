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
})
