import { describe, expect, it } from 'vitest'
import stripAnsi from 'strip-ansi'
import { Context } from '@/sys0/context'
import { FRead } from '@/sys0/fs'
import { Process } from '@/sys0/proc'
import { ProcessTable } from '@/sys0/process_table'
import { Readline } from '@/sys0/readline'
import { Stdio, Stdout } from '@/sys0/stdio'
import { Term } from '@/sys0/term'

class KeyInput implements FRead {
  constructor(private readonly keys: string[]) {}

  readKey() {
    const key = this.keys.shift()
    if (key === undefined) throw new Error('Readline requested an unexpected key')
    return key
  }

  read() { return '' }
  readUntil() { return '' }
  readLn() { return '' }
}

const createReadline = (keys: string[]) => {
  const terminalWrites: string[] = []
  const term = {
    buffer: { active: { cursorX: 0 } },
    cols: 80,
    doEcho: true,
    getStringWidth: (value: string) => value.length,
    write: (value: string) => terminalWrites.push(value),
  } as unknown as Term
  const output = new Stdout(term)
  const stdio = new Stdio(new KeyInput(keys), output)
  stdio.stdout = output
  const context = {
    processes: new ProcessTable(),
    term,
  } as Context
  const process = new Process(context, null, {
    name: 'readline-test',
    stdio,
  })
  return {
    readline: new Readline(process, stdio, term),
    terminalWrites,
  }
}

const completions = [
  { display: 'echo', value: 'cho' },
  { display: 'exit', value: 'xit' },
]

describe('readline completion editing', () => {
  it.each([
    ['Alt + Backspace', '\x1B\x7F'],
    ['Alt + W', '\x1Bw'],
    ['Ctrl + W', '\x17'],
  ])('uses the accepted candidate for %s word deletion', async (_, deleteWord) => {
    const { readline } = createReadline(['say e', '\t', '\t', deleteWord, '\r'])

    await expect(readline.readLn({ onComp: () => completions })).resolves.toBe('say ')
  })

  it('dismisses an unselected completion list when text editing begins', async () => {
    const { readline } = createReadline(['e', '\t', 'x', '\r'])

    await expect(readline.readLn({ onComp: () => completions })).resolves.toBe('ex')
  })

  it('marks partial terminal output before writing the next prompt', () => {
    const { readline, terminalWrites } = createReadline([])
    readline.stdio.write('partial output')

    readline.createLoop({ prompt: '> ' }).writePrompt()

    expect(stripAnsi(terminalWrites.join(''))).toBe('partial output%\r\n> ')
  })
})
