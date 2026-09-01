import stripAnsi from 'strip-ansi'
import { describe, expect, it } from 'vitest'
import { cat } from '@/programs/cat'
import { createHsh } from '@/programs/hsh'
import { tee } from '@/programs/tee'
import { Context } from '@/sys0/context'
import { FRead, Fs } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import { Process } from '@/sys0/proc'
import { ProcessTable } from '@/sys0/process_table'
import { Stdio, Stdout } from '@/sys0/stdio'
import { Term } from '@/sys0/term'

class KeyInput implements FRead {
  constructor(private readonly keys: string[]) {}

  readKey() {
    const key = this.keys.shift()
    if (key === undefined) throw new Error('Shell requested an unexpected key')
    return key
  }

  read() { return '' }
  readUntil() { return '' }
  readLn() { return '' }
}

const runShell = async (keys: string[]) => {
  const terminalWrites: string[] = []
  const term = {
    buffer: { active: { cursorX: 0 } },
    cols: 80,
    doEcho: true,
    getStringWidth: (value: string) => value.length,
    write: (value: string) => terminalWrites.push(value),
  } as unknown as Term
  const fs = new Fs(Vfs.dir({
    'complete.txt': Vfs.normal('complete\n'),
    'partial.txt': Vfs.normal('partial'),
  }), { persistence: new MemoryFsPersistence() })
  const output = new Stdout(term)
  const stdio = new Stdio(new KeyInput(keys), output)
  stdio.stdout = output
  stdio.stderr = output
  const context = {
    fs,
    processes: new ProcessTable(),
    term,
  } as Context
  const shell = new Process(context, null, {
    name: 'hsh',
    env: { HOME: '/', PATH: '/bin', PWD: '/' },
    stdio,
  })
  const hsh = createHsh({ builtins: { cat, tee } })

  await hsh(shell, 'hsh')

  return {
    fs,
    output: stripAnsi(terminalWrites.join('')),
  }
}

describe('interactive partial-line output', () => {
  it('marks cat output at the following prompt without changing file data', async () => {
    const { fs, output } = await runShell([
      'cat /partial.txt', '\r',
      '\x04',
    ])

    expect(output).toContain('partial%\r\n/ $ ')
    expect(fs.openU('/partial.txt', 'r').handle.read()).toBe('partial')
  })

  it('marks tee output at the following prompt without writing the mark to its file', async () => {
    const { fs, output } = await runShell([
      'tee /copy.txt', '\r',
      'partial', '\x04',
      '\x04',
    ])

    expect(output).toContain('partial%\r\n/ $ ')
    expect(fs.openU('/copy.txt', 'r').handle.read()).toBe('partial')
  })

  it('does not insert a mark between files when the combined cat output ends with a newline', async () => {
    const { output } = await runShell([
      'cat /partial.txt /complete.txt', '\r',
      '\x04',
    ])

    expect(output).toContain('partialcomplete\r\n/ $ ')
    expect(output).not.toContain('partial%')
  })
})
