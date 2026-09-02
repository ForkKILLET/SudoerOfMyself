import { describe, expect, it } from 'vitest'
import stripAnsi from 'strip-ansi'
import { Context } from '@/sys0/context'
import { FRead } from '@/sys0/fs'
import { Process } from '@/sys0/proc'
import { ProcessTable } from '@/sys0/process_table'
import { Readline, ReadlineHistory } from '@/sys0/readline'
import { Stdin, Stdio, Stdout } from '@/sys0/stdio'
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

class PushInput implements FRead {
  private keys: string[] = []
  private resolveKey: ((key: string) => void) | null = null

  push(key: string) {
    if (this.resolveKey) {
      const resolve = this.resolveKey
      this.resolveKey = null
      resolve(key)
    }
    else this.keys.push(key)
  }

  readKey() {
    const key = this.keys.shift()
    if (key !== undefined) return key
    return new Promise<string>((resolve) => {
      this.resolveKey = resolve
    })
  }

  read() { return '' }
  readUntil() { return '' }
  readLn() { return '' }
}

const createReadline = (source: string[] | FRead) => {
  const terminalWrites: string[] = []
  const term = {
    buffer: { active: { cursorX: 0 } },
    cols: 80,
    doEcho: true,
    getStringWidth: (value: string) => value.length,
    write: (value: string) => terminalWrites.push(value),
  } as unknown as Term
  const output = new Stdout(term)
  const stdio = new Stdio(Array.isArray(source) ? new KeyInput(source) : source, output)
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

const createTerminalReadline = () => {
  const dataListeners: Array<(data: string) => void> = []
  const terminalWrites: string[] = []
  const term = {
    buffer: { active: { cursorX: 0 } },
    cols: 80,
    doEcho: true,
    getStringWidth: (value: string) => value.length,
    on: (event: string, listener: (data: string) => void) => {
      if (event === 'data') dataListeners.push(listener)
      return { dispose() {} }
    },
    write: (value: string) => terminalWrites.push(value),
  } as unknown as Term
  const input = new Stdin(term)
  const output = new Stdout(term)
  const stdio = new Stdio(input, output)
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
    paste: (data: string) => dataListeners.forEach(listener => listener(data)),
  }
}

const completions = [
  { display: 'echo', value: 'cho' },
  { display: 'exit', value: 'xit' },
]

describe('readline completion editing', () => {
  it('limits retained entries using the current HISTSIZE value', () => {
    let maxSize = 2
    const history = new ReadlineHistory(['one', 'two', 'three', ''], () => maxSize)

    expect(history.hist).toEqual(['two', 'three', ''])
    history.current = 'four'
    maxSize = 1
    history.commit()

    expect(history.hist).toEqual(['four', ''])
  })

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

  it('writes a notification above and restores the active input line', async () => {
    const input = new PushInput()
    const { readline, terminalWrites } = createReadline(input)
    const reading = readline.readLn()

    input.push('partially typed')
    await Promise.resolve()
    readline.writeAbove('[1]  + 42 done       example &')
    input.push('\r')

    await expect(reading).resolves.toBe('partially typed')
    expect(stripAnsi(terminalWrites.join('')))
      .toContain('[1]  + 42 done       example &\r\npartially typed')
  })
})

describe('readline multiline paste', () => {
  it('submits complete lines and keeps the final partial line for the next prompt', async () => {
    const { readline, paste } = createTerminalReadline()
    const firstLine = readline.readLn()

    paste('echo a\necho b')

    await expect(firstLine).resolves.toBe('echo a')
    const secondLine = readline.readLn()
    await Promise.resolve()
    paste('\r')
    await expect(secondLine).resolves.toBe('echo b')
  })
})
