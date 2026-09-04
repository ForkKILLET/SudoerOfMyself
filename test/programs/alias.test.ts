import { describe, expect, it } from 'vitest'
import { alias, unalias } from '@/programs/alias'
import { echo } from '@/programs/echo'
import { createHsh } from '@/programs/hsh'
import { Context } from '@/sys0/context'
import { FRead, Fs, FWrite } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import { Process } from '@/sys0/proc'
import { ProcessTable } from '@/sys0/process_table'
import { Stdio } from '@/sys0/stdio'

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

const createShell = () => {
  const output = new MemoryOutput()
  const error = new MemoryOutput()
  const context = {
    fs: new Fs(Vfs.dir({}), { persistence: new MemoryFsPersistence() }),
    processes: new ProcessTable(),
  } as Context
  const process = new Process(context, null, {
    name: 'hsh',
    env: { HOME: '/', PATH: '/bin', PWD: '/' },
    stdio: new Stdio(new EmptyInput(), output, error),
  })
  return { error, output, process }
}

describe('alias builtins', () => {
  it('defines and expands an alias in the current shell', async () => {
    const { output, process } = createShell()
    const hsh = createHsh({ builtins: { alias, echo, unalias } })

    await hsh(process, 'hsh', '-c', String.raw`alias ll='echo hello'; ll world; alias ll; unalias ll`)

    expect(output.content).toBe(String.raw`hello world
alias ll='echo hello'
`)
    expect(process.aliases.has('ll')).toBe(false)
  })

  it('lists aliases with reusable shell quoting and reports missing names', async () => {
    const { error, output, process } = createShell()

    await expect(alias(process, 'alias', String.raw`say=echo 'hello'`)).resolves.toBe(0)
    await expect(alias(process, 'alias', 'say', 'missing')).resolves.toBe(1)

    expect(output.content).toBe(String.raw`alias say='echo '\''hello'\'''
`)
    expect(error.content).toContain('missing: not found')
  })

  it('copies aliases only for children inheriting shell state', () => {
    const { process } = createShell()
    process.aliases.set('ll', 'ls -l')

    const shellChild = process.fork({ name: 'child', inheritShellVariables: true })
    const externalChild = process.fork({ name: 'external' })
    shellChild.aliases.set('ll', 'ls -la')

    expect(process.aliases.get('ll')).toBe('ls -l')
    expect(shellChild.aliases.get('ll')).toBe('ls -la')
    expect(externalChild.aliases.has('ll')).toBe(false)
  })

  it('allows replacement text to introduce shell control syntax', async () => {
    const { output, process } = createShell()
    const hsh = createHsh({ builtins: { alias, echo, unalias } })

    await hsh(
      process,
      'hsh',
      '-c',
      String.raw`alias both='echo first; echo second'; both`,
    )

    expect(output.content).toBe('first\nsecond\n')
  })
})
