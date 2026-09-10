import { describe, expect, it } from 'vitest'
import stripAnsi from 'strip-ansi'
import stringWidth from 'string-width'
import { VimRenderer } from '@/programs/editor/vim_renderer'
import { TextBuffer } from '@/programs/editor/text_buffer'
import type { TerminalSession } from '@/sys0/terminal_session'

const createRenderer = (content: string, cols = 20, rows = 5) => {
  const writes: string[] = []
  const term = { rows, cols, getStringWidth: stringWidth }
  const session = { term, write: (data: string) => writes.push(data) } as unknown as TerminalSession
  const buffer = new TextBuffer(content)
  return { writes, term, buffer, renderer: new VimRenderer(session, buffer) }
}

describe('vim renderer', () => {
  it('highlights the active number and shades the complete logical line including wrapped padding', () => {
    const { renderer, writes, buffer } = createRenderer('abc界def\nnext', 7, 6)
    renderer.render({ mode: 'normal', number: true, wrap: true })
    const rows = writes[0].split('\r\n')
    expect(rows[0]).toContain('\x1B[1;93m 1\x1B[0m\x1B[48;5;236m ')
    expect(rows[1]).toContain('\x1B[48;5;236m')
    expect(rows[2]).toContain('\x1B[48;5;236m')
    expect(rows[2]).toMatch(/\x1B\[48;5;236m[^\x1B]*\x1B\[0m$/u)
    expect(rows[3]).toContain('\x1B[90m 2\x1B[0m ')
    expect(rows[3]).not.toContain('\x1B[48;5;236m')
    expect(rows.at(- 1)).not.toContain('\x1B[48;5;236m')
    buffer.moveTo(1)
    renderer.render({ mode: 'command', number: true, wrap: true, command: 'set' })
    const moved = writes[1].split('\r\n')
    expect(moved[0]).not.toContain('\x1B[48;5;236m')
    expect(moved[3]).toContain('\x1B[1;93m 2\x1B[0m\x1B[48;5;236m ')
    expect(moved[3]).toContain('\x1B[48;5;236m')
  })

  it('can disable the gray background while retaining the current number highlight', () => {
    const { renderer, writes } = createRenderer('text', 10)
    renderer.render({ mode: 'normal', number: true, cursorline: false })
    expect(writes[0]).not.toContain('\x1B[48;5;236m')
    expect(writes[0]).toContain('\x1B[1;93m 1\x1B[0m ')
  })

  it('restores gray after a search match and does not leak it to other rows', () => {
    const { renderer, writes } = createRenderer('a match tail\nother', 20)
    renderer.render({ mode: 'normal', searchHighlights: [{ start: { row: 0, column: 2 }, end: { row: 0, column: 7 } }] })
    const lines = writes[0].split('\r\n')
    expect(lines[0]).toContain('\x1B[30;43mh\x1B[0m\x1B[48;5;236m tail')
    expect(lines[0]).toMatch(/\x1B\[0m$/u)
    expect(lines[1]).not.toContain('\x1B[48;5;236m')
  })

  it('numbers logical lines and leaves the gutter blank on continuation rows', () => {
    const { renderer, writes } = createRenderer('abcdefghij\nxy', 7, 6)
    renderer.render({ mode: 'normal', number: true, wrap: true })
    expect(stripAnsi(writes[0]).split('\r\n').slice(0, 4)).toEqual([
      ' 1 abcd', '   efgh', '   ij  ', ' 2 xy  ',
    ])
  })

  it('wraps before wide characters and highlights matches across screen rows', () => {
    const { renderer, writes, buffer } = createRenderer('ab界x', 6, 4)
    buffer.moveTo(0, 3)
    renderer.render({ mode: 'normal', number: true, wrap: true, searchHighlights: [
      { start: { row: 0, column: 1 }, end: { row: 0, column: 4 } },
    ] })
    expect(stripAnsi(writes[0]).split('\r\n').slice(0, 2)).toEqual([' 1 ab ', '   界x'])
    expect(writes[0]).toContain('\x1B[30;43m界\x1B[0m')
    expect(writes[0]).toContain('\x1B[4;30;43mx\x1B[0m')
  })

  it('keeps an insertion cursor after an exactly full wrapped line visible', () => {
    const { renderer, writes, buffer } = createRenderer('abcd', 4, 4)
    buffer.moveToLineEnd()
    renderer.render({ mode: 'insert', wrap: true })
    expect(stripAnsi(writes[0]).split('\r\n').slice(0, 2)).toEqual(['abcd', '    '])
    expect(writes[0].split('\r\n')[1]).toContain('\x1B[7m \x1B[0m')
  })

  it('scrolls inside a single long line, pages by screen rows, and can turn wrap off', () => {
    const { renderer, writes, buffer } = createRenderer('abcdefghijklmnop', 4, 3)
    renderer.movePage(1, true, false)
    expect(buffer.cursor).toEqual({ row: 0, column: 8 })
    renderer.render({ mode: 'normal', wrap: true })
    expect(stripAnsi(writes[0]).split('\r\n').slice(0, 2)).toEqual(['efgh', 'ijkl'])
    renderer.render({ mode: 'normal', wrap: false })
    expect(stripAnsi(writes[1]).split('\r\n')[0]).toBe('fghi')
    renderer.movePage(- 1, true, false)
    expect(buffer.cursor).toEqual({ row: 0, column: 0 })
    expect(buffer.content).toBe('abcdefghijklmnop')
  })

  it.each([1, 2, 3, 4, 6, 10])('fits tabs, Unicode and gutters into %i columns after resize', (columns) => {
    const { renderer, writes, buffer, term } = createRenderer('ab\t界😀\x01tail', 20, 4)
    renderer.render({ mode: 'normal', wrap: true, number: true })
    term.cols = columns
    buffer.moveToLineEnd()
    renderer.render({ mode: 'insert', wrap: true, number: true })
    const frame = writes.at(- 1) !
    expect(stripAnsi(frame).split('\r\n').map(line => stringWidth(line))).toEqual(Array(4).fill(columns))
    expect(frame).toContain('\x1B[7m \x1B[0m')
  })

  it.each([['', 0, 0], ['a', 1, 1], ['a\n', 1, 2], ['\n\n', 2, 2], ['你好\n😀', 2, 11]])(
    'reports file lines and UTF-8 bytes for %j', (content, lines, bytes) => {
      const { renderer, writes } = createRenderer(content, 40)
      renderer.render({ mode: 'normal', filename: 'note.txt' })
      expect(stripAnsi(writes[0]).split('\r\n').at(- 1)?.trim()).toBe(`"note.txt" ${lines}L, ${bytes}B`)
    },
  )

  it('fits the centered welcome screen after resizing', () => {
    const { renderer, writes, term } = createRenderer('', 60, 20)
    renderer.render({ mode: 'normal', welcome: true })
    const lines = stripAnsi(writes[0]).split('\r\n')
    expect(lines[7].trim()).toBe('HumanOS vim')
    expect(lines[7].indexOf('HumanOS vim')).toBe(24)
    term.rows = 2
    term.cols = 4
    renderer.render({ mode: 'normal', welcome: true })
    expect(stripAnsi(writes[1]).split('\r\n').map(line => stringWidth(line))).toEqual([4, 4])
  })

  it('shows search direction and highlights the active Unicode match', () => {
    const { renderer, buffer, writes } = createRenderer('你好 世界', 20)
    renderer.render({ mode: 'command', commandPrefix: '?', command: '你好' })
    expect(stripAnsi(writes[0])).toContain('?你好')
    buffer.moveTo(0, 3)
    renderer.render({ mode: 'normal', searchHighlight: { start: { row: 0, column: 3 }, end: { row: 0, column: 5 } } })
    expect(writes[1]).toContain('\x1B[4;30;43m世\x1B[0m')
    expect(writes[1]).toContain('\x1B[30;43m界\x1B[0m')
  })

  it('shows file controls as text and draws only one cursor in Command mode', () => {
    const { renderer, writes } = createRenderer('a\x1B[31m')
    renderer.render({ mode: 'normal' })
    expect(stripAnsi(writes[0])).toContain('a^[[31m')
    renderer.render({ mode: 'command', command: 'w' })
    expect(writes[1].match(/\x1B\[7m/gu)).toHaveLength(1)
    expect(writes[1]).toContain(':w\x1B[7m \x1B[0m')
  })

  it('scrolls enough to keep an entire wide cursor at the right edge visible', () => {
    const { renderer, buffer, writes } = createRenderer('abcd界尾', 5)
    buffer.moveTo(0, 4)
    renderer.render({ mode: 'normal' })
    expect(writes[0]).toContain('bcd\x1B[7m界\x1B[0m')
    expect(stripAnsi(writes[0]).split('\r\n').every(line => stringWidth(line) === 5)).toBe(true)
  })

  it('keeps the cursor visible even when a tab or wide character is wider than the terminal', () => {
    for (const content of ['界', '\t', '\x01']) {
      const { renderer, writes } = createRenderer(content, 1)
      renderer.render({ mode: 'normal' })
      expect(writes[0]).toContain('\x1B[7m \x1B[0m')
      expect(stripAnsi(writes[0]).split('\r\n').every(line => stringWidth(line) === 1)).toBe(true)
    }
  })

  it('shows and scrolls the command line even on a one-row terminal', () => {
    const { renderer, writes } = createRenderer('content', 4, 1)
    renderer.render({ mode: 'command', command: 'w very-long-name' })
    expect(stripAnsi(writes[0])).toBe('ame ')
    expect(writes[0]).toContain('\x1B[7m \x1B[0m')
  })

  it('scrolls vertically and refits frames after resizing', () => {
    const { renderer, buffer, writes, term } = createRenderer('one\ntwo\nthree\nfour\nfive', 20, 3)
    buffer.moveTo(4)
    renderer.render({ mode: 'normal' })
    expect(stripAnsi(writes[0]).split('\r\n').slice(0, 2).map(line => line.trim())).toEqual(['four', 'five'])
    term.cols = 3
    term.rows = 2
    renderer.render({ mode: 'insert' })
    expect(stripAnsi(writes[1]).split('\r\n').map(line => stringWidth(line))).toEqual([3, 3])
  })

  it('wraps and scrolls help while preserving the file viewport', () => {
    const { renderer, buffer, writes } = createRenderer('one\ntwo\nthree\nfour\nfive', 30, 4)
    buffer.moveTo(4)
    renderer.render({ mode: 'normal' })
    const before = writes.at(- 1)
    renderer.render({ mode: 'normal', help: true })
    expect(writes.at(- 1)).toContain('HumanOS vim - Help')
    renderer.scrollHelp(Infinity)
    renderer.render({ mode: 'normal', help: true })
    expect(stripAnsi(writes.at(- 1) !).split('\r\n').map(line => line.trim()).join('')).toContain('registers')
    renderer.render({ mode: 'normal' })
    expect(writes.at(- 1)).toBe(before)
  })
})
