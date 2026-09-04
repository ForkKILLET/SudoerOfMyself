import { describe, expect, it, vi } from 'vitest'
import stripAnsi from 'strip-ansi'
import { nano } from '@/programs/nano'
import type { Context } from '@/sys0/context'
import { Fs } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import { Process } from '@/sys0/proc'
import { ProcessTable } from '@/sys0/process_table'
import { Stdin, Stdio, Stdout } from '@/sys0/stdio'
import type { Term } from '@/sys0/term'

class FakeTerm {
  readonly writes: string[] = []
  readonly dataListeners: Array<(data: string) => void> = []
  readonly resizeListeners: Array<(size: { rows: number, cols: number }) => void> = []
  doEcho = true
  signalInterrupt = true
  rows = 12
  cols = 60
  applicationKeyHandler: ((event: KeyboardEvent) => boolean) | null = null

  on(event: string, listener: (data: string) => void) {
    if (event === 'data') this.dataListeners.push(listener)
    return { dispose: () => {} }
  }

  onResize(listener: (size: { rows: number, cols: number }) => void) {
    this.resizeListeners.push(listener)
    return {
      dispose: () => {
        const index = this.resizeListeners.indexOf(listener)
        if (index !== - 1) this.resizeListeners.splice(index, 1)
      },
    }
  }

  setApplicationKeyHandler(handler: ((event: KeyboardEvent) => boolean) | null) {
    this.applicationKeyHandler = handler
  }

  write(data: string) {
    this.writes.push(data)
  }

  getStringWidth(value: string) {
    return Array.from(value).length
  }

  input(data: string) {
    this.dataListeners.forEach(listener => listener(data))
  }
}

const createEditorProcess = () => {
  const term = new FakeTerm()
  const fs = new Fs(Vfs.dir({ home: Vfs.dir({}) }), {
    persistence: new MemoryFsPersistence(),
  })
  const context = {
    fs,
    processes: new ProcessTable(),
    term: term as unknown as Term,
  } as Context
  const input = new Stdin(context.term)
  const output = new Stdout(context.term)
  const process = new Process(context, null, {
    name: 'nano',
    cwd: '/home',
    stdio: new Stdio(input, output),
  })
  return { fs, process, term }
}

describe('nano editor', () => {
  it('edits a new file, writes it, and restores the terminal on exit', async () => {
    const { fs, process, term } = createEditorProcess()
    const completion = nano(process, 'nano', 'note.txt')

    term.input('hello 世界\x0F\r\x18')

    await expect(completion).resolves.toBe(0)
    expect(fs.openU('/home/note.txt', 'r').handle.read()).toBe('hello 世界')
    expect(term.writes.join('')).toContain('HumanOS nano')
    expect(term.writes.at(- 1)).toContain('\x1B[?1049l')
    expect(term.doEcho).toBe(true)
    expect(term.signalInterrupt).toBe(true)
    expect(term.applicationKeyHandler).toBeNull()
  })

  it('can discard a modified buffer without creating the target file', async () => {
    const { fs, process, term } = createEditorProcess()
    const completion = nano(process, 'nano', 'discarded.txt')

    term.input('changed\x18n')

    await expect(completion).resolves.toBe(0)
    expect(fs.find('/home/discarded.txt').isErr).toBe(true)
    const confirmation = term.writes.find(frame => frame.includes('Save modified buffer?'))
    expect(confirmation).toBeDefined()
    const footer = stripAnsi(confirmation !).split('\r\n').slice(- 2)
    expect(footer[0].startsWith(' Y Yes')).toBe(true)
    expect(footer[1].startsWith(' N No')).toBe(true)
    expect(footer[1].indexOf('^C Cancel')).toBe(16)
    expect(footer.join('\n')).not.toContain('^X  Exit')
  })

  it('restores the default footer after cancelling exit confirmation', async () => {
    const { fs, process, term } = createEditorProcess()
    const completion = nano(process, 'nano', 'cancelled-exit.txt')

    term.input('changed\x18\x03\x0F\r\x18')

    await expect(completion).resolves.toBe(0)
    expect(fs.openU('/home/cancelled-exit.txt', 'r').handle.read()).toBe('changed')
    expect(term.writes.some(frame => (
      frame.includes('Cancelled') && stripAnsi(frame).includes('^X Exit')
    ))).toBe(true)
  })

  it('returns from a scrollable help screen to the same editing cursor', async () => {
    const { fs, process, term } = createEditorProcess()
    const completion = nano(process, 'nano', 'help.txt')
    term.input('ab\x07ignored\x1B[6~\x1B[F\x18!\x0F\r\x18')
    await expect(completion).resolves.toBe(0)
    expect(fs.openU('/home/help.txt', 'r').handle.read()).toBe('ab!')
    expect(term.writes.some(frame => frame.includes('HumanOS nano - Help'))).toBe(true)
    expect(term.writes.some(frame => frame.includes('returns to the unchanged editing buffer'))).toBe(true)
  })

  it('searches with the browser-safe shortcut, repeats, and saves edits at both locations', async () => {
    const { fs, process, term } = createEditorProcess()
    fs.openU('/home/search.txt', 'w').handle.write('needle alpha\nneedle beta')
    const completion = nano(process, 'nano', 'search.txt')
    term.input('\x06needle\r\x1BwX\x141,2\r!\x0F\r\x18')
    await expect(completion).resolves.toBe(0)
    expect(fs.openU('/home/search.txt', 'r').handle.read()).toBe('n!eedle alpha\nXneedle beta')
  })

  it('keeps Ctrl+W as a search alias when the browser delivers it', async () => {
    const { fs, process, term } = createEditorProcess()
    fs.openU('/home/search.txt', 'w').handle.write('before needle after')
    const completion = nano(process, 'nano', 'search.txt')
    term.input('\x17needle\rX\x0F\r\x18')
    await expect(completion).resolves.toBe(0)
    expect(fs.openU('/home/search.txt', 'r').handle.read()).toBe('before Xneedle after')
  })

  it('opens help from the search prompt and returns to the unfinished query', async () => {
    const { fs, process, term } = createEditorProcess()
    fs.openU('/home/search.txt', 'w').handle.write('needle')
    const completion = nano(process, 'nano', 'search.txt')
    term.input('\x06nee\x07ignored\x18dle\rX\x0F\r\x18')

    await expect(completion).resolves.toBe(0)
    expect(fs.openU('/home/search.txt', 'r').handle.read()).toBe('Xneedle')
    expect(term.writes.some(frame => frame.includes('HumanOS nano - Help'))).toBe(true)
  })

  it('highlights matches without a found bar and reports wrapping and misses', async () => {
    const { fs, process, term } = createEditorProcess()
    fs.openU('/home/search.txt', 'w').handle.write('needle middle needle')
    const completion = nano(process, 'nano', 'search.txt')
    term.input('\x06needle\r\x1Bw\x1Bw\x06\x15missing\r\x18')

    await expect(completion).resolves.toBe(0)
    expect(term.writes.some(frame => frame.includes(
      '\x1B[4;30;43mn\x1B[0m\x1B[30;43meedle\x1B[0m',
    ))).toBe(true)
    expect(term.writes.some(frame => frame.includes('\x1B[30;47m[ Search Wrapped ]'))).toBe(true)
    expect(term.writes.some(frame => frame.includes('\x1B[37;41m[ "missing" not found ]'))).toBe(true)
    expect(term.writes.every(frame => ! frame.includes('Found:'))).toBe(true)
  })

  it('removes the search highlight after a short delay', async () => {
    vi.useFakeTimers()
    try {
      const { fs, process, term } = createEditorProcess()
      fs.openU('/home/search.txt', 'w').handle.write('needle')
      const completion = nano(process, 'nano', 'search.txt')
      term.input('\x06needle\r')
      await vi.advanceTimersByTimeAsync(0)

      expect(term.writes.at(- 1)).toContain(
        '\x1B[4;30;43mn\x1B[0m\x1B[30;43meedle\x1B[0m',
      )
      await vi.advanceTimersByTimeAsync(2_499)
      expect(term.writes.at(- 1)).toContain(
        '\x1B[4;30;43mn\x1B[0m\x1B[30;43meedle\x1B[0m',
      )
      await vi.advanceTimersByTimeAsync(1)
      expect(term.writes.at(- 1)).not.toContain('\x1B[30;43meedle\x1B[0m')

      term.input('\x18')
      await expect(completion).resolves.toBe(0)
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('accumulates consecutive cuts and supports Meta undo, redo, and line copy', async () => {
    const { fs, process, term } = createEditorProcess()
    fs.openU('/home/cut.txt', 'w').handle.write('one\ntwo\nthree')
    const completion = nano(process, 'nano', 'cut.txt')
    term.input('\x0B\x0B\x15\x1Bu\x1Be\x1B6\x15\x0F\r\x18')
    await expect(completion).resolves.toBe(0)
    expect(fs.openU('/home/cut.txt', 'r').handle.read()).toBe('one\ntwo\nthree\nthree')
  })

  it('marks a range with Ctrl-6 and cuts the complete selection', async () => {
    const { fs, process, term } = createEditorProcess()
    fs.openU('/home/marked.txt', 'w').handle.write('one\ntwo')
    const completion = nano(process, 'nano', 'marked.txt')

    term.input('\x1E\x1B[F\x1B[C\x1B[C\x0B\x0F\r\x18')

    await expect(completion).resolves.toBe(0)
    expect(fs.openU('/home/marked.txt', 'r').handle.read()).toBe('wo')
    expect(term.writes.some(frame => frame.includes('\x1B[7mone\x1B[0m'))).toBe(true)
  })

  it('copies a marked range and unsets the mark afterwards', async () => {
    const { fs, process, term } = createEditorProcess()
    fs.openU('/home/copied-mark.txt', 'w').handle.write('abcd')
    const completion = nano(process, 'nano', 'copied-mark.txt')

    term.input('\x1E\x1B[C\x1B[C\x1B6\x1B[1;5F\x15\x0F\r\x18')

    await expect(completion).resolves.toBe(0)
    expect(fs.openU('/home/copied-mark.txt', 'r').handle.read()).toBe('abcdab')
    expect(term.writes.some(frame => frame.includes('Copied selection'))).toBe(true)
  })

  it('edits an existing filename prompt with cursor movement', async () => {
    const { fs, process, term } = createEditorProcess()
    const completion = nano(process, 'nano', 'note.txt')
    term.input('text\x0F\x1B[D\x1B[D\x1B[D\x1B[D-copy\r\x18')
    await expect(completion).resolves.toBe(0)
    expect(fs.openU('/home/note-copy.txt', 'r').handle.read()).toBe('text')
    expect(fs.find('/home/note.txt').isErr).toBe(true)
  })

  it('returns a signal exit and restores the terminal when killed', async () => {
    const { process, term } = createEditorProcess()
    const completion = nano(process, 'nano')

    process.sendSignal('SIGTERM')

    await expect(completion).resolves.toEqual({
      reason: 'signal',
      signal: 'SIGTERM',
      code: 143,
    })
    expect(term.writes.at(- 1)).toContain('\x1B[?1049l')
    expect(term.doEcho).toBe(true)
  })
})
