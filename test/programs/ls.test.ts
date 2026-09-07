import { describe, expect, it } from 'vitest'
import { ls } from '@/programs/ls'
import { Context } from '@/sys0/context'
import { FRead, Fs, FWrite } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import { AccountService } from '@/sys0/identity'
import { Process } from '@/sys0/proc'
import { ProcessTable } from '@/sys0/process_table'
import { Stdio } from '@/sys0/stdio'
import type { Term } from '@/sys0/term'

class EmptyInput implements FRead {
  readKey() { return '\x04' }
  read() { return '' }
  readUntil() { return '' }
  readLn() { return '' }
}

class MemoryOutput implements FWrite {
  content = ''
  write(data: string) { this.content += data }
  writeLn(data: string) { this.write(data + '\n') }
}

const createProcess = () => {
  const output = new MemoryOutput()
  const error = new MemoryOutput()
  const fs = new Fs(Vfs.dir({
    empty: Vfs.dir(),
    file: Vfs.normal('data'),
    first: Vfs.dir({ alpha: Vfs.normal('a') }),
    hidden: Vfs.dir({ '.secret': Vfs.normal('secret') }),
    second: Vfs.dir({ beta: Vfs.normal('bb') }),
  }), { persistence: new MemoryFsPersistence() })
  const term = {
    cols: 80,
    getStringWidth: (value: string) => Array.from(value).length,
  } as Term
  const context = {
    accounts: new AccountService(),
    fs,
    processes: new ProcessTable(),
    term,
  } as Context
  const process = new Process(context, null, {
    name: 'hsh',
    cwd: '/',
    stdio: new Stdio(new EmptyInput(), output, error),
  })
  return { error, output, process }
}

const runLs = async (...args: string[]) => {
  const fixture = createProcess()
  const status = await ls(fixture.process, 'ls', '--no-color', ...args)
  return { ...fixture, status }
}

const longEntry = (size: number, name: string) => (
  `-rw-r--r--  ${'root'.padEnd(8)} ${'root'.padEnd(8)} ${size.toString().padStart(8)} ${name}`
)

describe('ls output layout', () => {
  it('terminates the default current-directory listing', async () => {
    const { output } = await runLs()

    expect(output.content).toBe('empty  file  first  hidden  second\n')
  })

  it('terminates single file and non-empty directory listings with one newline', async () => {
    const file = await runLs('file')
    const directory = await runLs('first')

    expect(file.output.content).toBe('file\n')
    expect(directory.output.content).toBe('alpha\n')
  })

  it('does not print a newline for a single empty directory', async () => {
    const { output } = await runLs('empty')

    expect(output.content).toBe('')
  })

  it('prints a filtered hidden-only directory only when all entries are requested', async () => {
    const hidden = await runLs('hidden')
    const all = await runLs('-a', 'hidden')
    const longAll = await runLs('-la', 'hidden')

    expect(hidden.output.content).toBe('')
    expect(all.output.content).toBe('.secret\n')
    expect(longAll.output.content).toBe(`${longEntry(6, '.secret')}\n`)
  })

  it('puts exactly one blank line between directory output blocks', async () => {
    const { output } = await runLs('first', 'second')

    expect(output.content).toBe('first:\nalpha\n\nsecond:\nbeta\n')
  })

  it('separates file and directory blocks and preserves an empty directory header', async () => {
    const populated = await runLs('file', 'first')
    const empty = await runLs('file', 'empty')

    expect(populated.output.content).toBe('file\n\nfirst:\nalpha\n')
    expect(empty.output.content).toBe('file\n\nempty:\n')
  })

  it('applies the same terminator and block rules to long listings', async () => {
    const file = longEntry(4, 'file')
    const alpha = longEntry(1, 'alpha')
    const beta = longEntry(2, 'beta')
    const single = await runLs('-l', 'file')
    const directories = await runLs('-l', 'first', 'second')
    const withEmpty = await runLs('-l', 'file', 'empty')

    expect(single.output.content).toBe(`${file}\n`)
    expect(directories.output.content).toBe(`first:\n${alpha}\n\nsecond:\n${beta}\n`)
    expect(withEmpty.output.content).toBe(`${file}\n\nempty:\n`)
  })

  it('keeps successful stdout blocks well-formed when another operand fails', async () => {
    const { error, output, status } = await runLs('missing', 'file', 'empty')

    expect(status).toBe(1)
    expect(output.content).toBe('file\n\nempty:\n')
    expect(error.content).toMatch(/^ls: .*missing.*\n$/u)
  })
})
