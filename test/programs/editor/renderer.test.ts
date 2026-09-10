import { describe, expect, it } from 'vitest'
import { EditorRenderer } from '@/programs/editor/renderer'
import { TextBuffer } from '@/programs/editor/text_buffer'
import type { TerminalSession } from '@/sys0/terminal_session'
import stripAnsi from 'strip-ansi'
import {
  NANO_EXIT_SHORTCUTS,
  NANO_SEARCH_SHORTCUTS,
  NANO_SHORTCUTS,
} from '@/programs/editor/nano_help'

const createRenderer = (content: string) => {
  const writes: string[] = []
  const term = {
    rows: 8,
    cols: 30,
    getStringWidth: (value: string) => Array.from(value)
      .reduce((width, char) => width + (char === '界' ? 2 : 1), 0),
  }
  const session = {
    term,
    write: (data: string) => writes.push(data),
  } as unknown as TerminalSession
  const buffer = new TextBuffer(content)
  return { buffer, renderer: new EditorRenderer(session, buffer), writes, term }
}

describe('editor renderer', () => {
  it('keeps nano numbers outside horizontally scrolled and highlighted text', () => {
    const { renderer, writes, buffer, term } = createRenderer('long text here\n界tail')
    term.cols = 8
    buffer.moveTo(0, 10)
    renderer.render({ lineNumbers: true, searchHighlight: { start: { row: 0, column: 10 }, end: { row: 0, column: 14 } } })
    expect(stripAnsi(writes[0]).split('\r\n')[1]).toBe(' 1 ext h')
    expect(writes[0].split('\r\n')[1].startsWith('\x1B[30;107m 1\x1B[0m ')).toBe(true)
    expect(writes[0].split('\r\n')[2].startsWith('\x1B[30;107m 2\x1B[0m ')).toBe(true)
    expect(writes[0]).toContain('\x1B[4;30;43mh\x1B[0m')
    buffer.moveTo(1)
    term.cols = 4
    renderer.render({ lineNumbers: true })
    expect(stripAnsi(writes[1]).split('\r\n').every(line => term.getStringWidth(line) === 4)).toBe(true)
    expect(writes[1]).toContain('\x1B[7m \x1B[0m')
  })

  it.each([8, 30, 60])('centers and clips line-number notices at %i columns', (columns) => {
    const { renderer, writes, term } = createRenderer('text')
    term.cols = columns

    for (const state of ['enabled', 'disabled']) {
      const text = `[ Line numbering ${state} ]`
      renderer.render({ notice: { text, tone: 'info' } })
      const width = Math.min(columns, text.length)
      const left = Math.floor((columns - width) / 2)
      expect(writes.at(- 1) !.split('\r\n').at(- 3)).toBe(
        ' '.repeat(left) + '\x1B[30;107m' + text.slice(0, width) + '\x1B[0m'
        + ' '.repeat(columns - left - width),
      )
    }
  })

  it('renders file control characters as visible text instead of terminal escapes', () => {
    const { renderer, writes } = createRenderer('safe\x1B[31m')

    renderer.render({ filename: 'note.txt' })

    expect(stripAnsi(writes[0])).toContain('safe^[[31m')
    expect(writes[0]).not.toContain('safe\x1B[31m')
  })

  it('renders a non-blinking cursor cell after wide characters and keeps the terminal cursor hidden', () => {
    const { buffer, renderer, writes } = createRenderer('界')
    buffer.moveToLineEnd()

    renderer.render()

    expect(writes[0]).toContain(`界\x1B[7m \x1B[0m`)
    expect(writes[0]).toContain('\x1B[?25l')
    expect(writes[0]).not.toContain('\x1B[?25h')
    expect(writes[0]).not.toMatch(/\x1B\[\d+;\d+H/u)
  })

  it('renders the cursor over the active character', () => {
    const { renderer, writes } = createRenderer('abc')

    renderer.render()

    expect(writes[0]).toContain('\x1B[7ma\x1B[0mbc')
  })

  it('highlights only the active search result in yellow', () => {
    const { renderer, writes } = createRenderer('before needle after')

    renderer.render({
      searchHighlight: {
        start: { row: 0, column: 7 },
        end: { row: 0, column: 13 },
      },
    })

    expect(writes[0]).toContain('\x1B[30;43mneedle\x1B[0m after')
    expect(stripAnsi(writes[0])).toContain('before needle after')
  })

  it('highlights a marked range and distinguishes its cursor endpoint', () => {
    const { buffer, renderer, writes } = createRenderer('abcd')
    buffer.moveTo(0, 2)

    renderer.render({ selection: buffer.rangeFrom({ row: 0, column: 0 }) })

    expect(writes[0]).toContain('\x1B[7mab\x1B[0m\x1B[4;7mc\x1B[0md')
  })

  it('renders selected newlines, including those on empty lines', () => {
    const { buffer, renderer, writes, term } = createRenderer('a\n\nb')
    term.rows = 24
    buffer.moveTo(2)

    renderer.render({ selection: buffer.rangeFrom({ row: 0, column: 1 }) })

    const lines = writes[0].split('\r\n')
    expect(lines[1]).toContain('a\x1B[7m \x1B[0m')
    expect(lines[2]).toContain('\x1B[7m \x1B[0m')
  })

  it('centers error and wrapped-search notices with distinct colors', () => {
    const { renderer, writes } = createRenderer('text')

    renderer.render({ notice: { text: '[ "lost" not found ]', tone: 'error' } })
    renderer.render({ notice: { text: '[ Search Wrapped ]', tone: 'wrapped' } })

    expect(writes[0]).toContain('\x1B[97;41m[ "lost" not found ]\x1B[0m')
    expect(writes[1]).toContain('\x1B[30;107m[ Search Wrapped ]\x1B[0m')
    for (const frame of writes) {
      const status = stripAnsi(frame).split('\r\n').at(- 3) !
      expect(status).toHaveLength(30)
      expect(status).toMatch(/^\s+\[.*\]\s+$/u)
    }
  })

  it.each([30, 60, 80, 121])('keeps the paired shortcut footer to two rows at %i columns', (columns) => {
    const { renderer, writes, term } = createRenderer('text')
    term.cols = columns
    term.rows = 24
    renderer.render()
    const lines = stripAnsi(writes[0]).split('\r\n')
    expect(lines).toHaveLength(term.rows)
    expect(lines.every(line => term.getStringWidth(line) === columns)).toBe(true)
    const footer = lines.slice(2 + renderer.pageRows)
    expect(footer).toHaveLength(2)
    expect(footer[0]).toContain('^G Help')
    expect(footer[1]).toContain('^X Exit')
    expect(footer.join('\n')).not.toContain('^G  Help')
    const styledFrame = writes[0]
    for (const shortcut of NANO_SHORTCUTS.slice(0, 4).filter(shortcut => shortcut !== null)) {
      expect(styledFrame).toContain(`\x1B[30;107m${shortcut.key}\x1B[0m\x1B[97m ${shortcut.label}`)
    }
  })

  it('uses fixed-width shortcut columns and leaves remainder at the right edge', () => {
    const { renderer, writes, term } = createRenderer('text')
    term.cols = 80
    term.rows = 24

    renderer.render()

    const footer = stripAnsi(writes[0]).split('\r\n').slice(- 2)
    expect(['^G', '^O', '^F', '^K', '^C'].map(key => footer[0].indexOf(key)))
      .toEqual([0, 13, 26, 39, 65])
    expect(footer[1].indexOf('^X')).toBe(0)
    expect(footer[1].indexOf('^U')).toBe(39)
    expect(footer[1].indexOf('^/')).toBe(65)
    expect(footer.join('\n')).not.toContain('M-U')

    term.cols = 100
    renderer.render()
    const wideFooter = stripAnsi(writes[1]).split('\r\n').slice(- 2)
    expect(['^G', '^O', '^F', '^K', '^C', 'M-U'].map(key => wideFooter[0].indexOf(key)))
      .toEqual([0, 14, 28, 42, 70, 84])
    expect(wideFooter[1].indexOf('M-E')).toBe(84)
    expect(wideFooter.join('\n')).not.toContain('M-A')
  })

  it('preserves nano shortcut positions while omitting unavailable actions', () => {
    const { renderer, writes, term } = createRenderer('text')
    term.cols = 121
    term.rows = 24

    renderer.render()

    const footer = stripAnsi(writes[0]).split('\r\n').slice(- 2)
    expect(footer[0]).toMatch(/\^G\s+Help.*\^O\s+Write.*\^F\s+Search.*\^K\s+Cut.*\^C\s+Position.*M-U\s+Undo.*M-A\s+Set Mark/u)
    expect(footer[1]).toMatch(/\^X\s+Exit.*\^U\s+Paste.*\^\/\s+Go To.*M-E\s+Redo.*M-6\s+Copy/u)
    expect(footer.join('\n')).not.toMatch(/Execute|Read File|Replace|Justify|To Bracket/u)
  })

  it('only shows implemented actions in the search footer', () => {
    const { renderer, writes, term } = createRenderer('text')
    term.cols = 97
    term.rows = 12

    renderer.render({
      prompt: {
        label: 'Search: ',
        value: 'needle',
        shortcuts: NANO_SEARCH_SHORTCUTS,
        shortcutColumns: 1,
        shortcutPairs: true,
      },
    })

    const footer = stripAnsi(writes[0]).split('\r\n').slice(- 2)
    expect(footer[0]).toContain('^G Help')
    expect(footer[1]).toContain('^C Cancel')
    expect(footer.join('\n')).not.toContain('^X  Exit')
    expect(footer.join('\n')).not.toMatch(/Case Sensitive|Regexp|Backwards|Replace|Older|Newer/u)
    expect(writes[0]).toContain('\x1B[30;107m^G\x1B[0m\x1B[97m Help')
    expect(writes[0]).toContain('\x1B[30;107m^C\x1B[0m\x1B[97m Cancel')
    expect(writes[0]).toContain('\x1B[97mSearch: needle\x1B[7m \x1B[0m\x1B[97m')
  })

  it('renders a two-column save-confirmation footer', () => {
    const { renderer, writes, term } = createRenderer('changed')
    term.cols = 60
    term.rows = 12

    renderer.render({
      message: 'Save modified buffer?',
      footer: {
        shortcuts: NANO_EXIT_SHORTCUTS,
        shortcutColumns: 2,
        shortcutColumnWidth: 16,
        shortcutPairs: true,
      },
    })

    const footer = stripAnsi(writes[0]).split('\r\n').slice(- 2)
    expect(footer[0].startsWith(' Y Yes')).toBe(true)
    expect(footer[1].startsWith(' N No')).toBe(true)
    expect(footer[1].indexOf('^C Cancel')).toBe(16)
    expect(footer.join('\n')).not.toContain('^X  Exit')
    expect(writes[0]).toContain('\x1B[30;107m Y\x1B[0m\x1B[97m Yes')
    expect(writes[0]).toContain('\x1B[30;107m N\x1B[0m\x1B[97m No')
    expect(writes[0]).toContain('\x1B[30;107m^C\x1B[0m\x1B[97m Cancel')
    expect(writes[0]).toContain('\x1B[30;107mSave modified buffer?')
  })

  it('shows help instead of file content and preserves the editing viewport', () => {
    const { buffer, renderer, writes, term } = createRenderer('secret content\n界😀tail')
    term.cols = 60
    buffer.moveTo(1, 2)
    renderer.render()
    const editingFrame = writes.at(- 1)
    renderer.render({ help: true })
    expect(writes.at(- 1)).toContain('HumanOS nano - Help')
    expect(writes.at(- 1)).toContain('\x1B[30;107m^X / Escape: back to editor')
    expect(writes.at(- 1)).not.toContain('secret content')
    renderer.scrollHelp(Number.MAX_SAFE_INTEGER)
    renderer.render({ help: true })
    expect(writes.at(- 1)).toContain('returns to the unchanged editing buffer')
    renderer.render()
    expect(writes.at(- 1)).toBe(editingFrame)
  })

  it('keeps frames and rendered prompt cursors inside a tiny resized terminal', () => {
    const { renderer, writes, term } = createRenderer('file')
    term.cols = 10
    term.rows = 3
    renderer.render({ prompt: { label: 'Search: ', value: 'long text', cursor: 1 } })
    expect(stripAnsi(writes[0]).split('\r\n')).toHaveLength(3)
    expect(writes[0]).toContain('\x1B[7mo\x1B[0m')
    expect(writes[0]).not.toMatch(/\x1B\[\d+;\d+H/u)
    renderer.render({ help: true })
    expect(stripAnsi(writes[1]).split('\r\n')).toHaveLength(3)
  })
})
