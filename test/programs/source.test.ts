import { describe, expect, it } from 'vitest'
import { alias } from '@/programs/alias'
import { cd } from '@/programs/cd'
import { echo } from '@/programs/echo'
import { createHsh } from '@/programs/hsh'
import { pwd } from '@/programs/pwd'
import { returnFromContext } from '@/programs/return'
import { set } from '@/programs/set'
import { createSourceBuiltin } from '@/programs/source'
import { fail, succeed } from '@/programs/status'
import type { Context } from '@/sys0/context'
import { FRead, Fs, FWrite } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import { Process } from '@/sys0/proc'
import type { Program } from '@/sys0/program'
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
  const fs = new Fs(Vfs.dir({
    home: Vfs.dir({
      'setup.hsh': Vfs.normal([
        'NAME=inside',
        String.raw`alias hi='echo hello'`,
        'cd /work',
      ].join('\n')),
      'arguments.hsh': Vfs.normal('echo "$1:$2:$#"; set -- changed'),
      'broken.hsh': Vfs.normal('if true; then'),
      'early.hsh': Vfs.normal([
        'echo before',
        'if true; then return 7; fi',
        'echo unreachable',
      ].join('\n')),
      'inner.hsh': Vfs.normal('return 9; echo unreachable-inner'),
      'outer.hsh': Vfs.normal([
        'echo outer-before',
        'source inner.hsh',
        'echo inner-status:$?',
        'echo outer-after',
      ].join('\n')),
      'default-return.hsh': Vfs.normal('false; return; echo unreachable-default'),
      'loop-return.hsh': Vfs.normal([
        'for i in 1 2; do',
        '  return 4',
        'done',
        'echo unreachable-loop',
      ].join('\n')),
      'invalid-return.hsh': Vfs.normal('return nope; echo unreachable-invalid'),
    }),
    scripts: Vfs.dir({
      config: Vfs.normal('FROM_PATH=yes'),
    }),
    work: Vfs.dir({}),
  }), { persistence: new MemoryFsPersistence() })
  const context = { fs, processes: new ProcessTable() } as Context
  const process = new Process(context, null, {
    name: 'hsh',
    cwd: '/home',
    env: { HOME: '/home', PATH: '/scripts' },
    stdio: new Stdio(new EmptyInput(), output, error),
  })
  const builtins: Record<string, Program> = {
    alias,
    cd,
    echo,
    false: fail,
    pwd,
    return: returnFromContext,
    set,
    true: succeed,
  }
  const source = createSourceBuiltin(() => builtins)
  builtins.source = source
  builtins['.'] = source
  const hsh = createHsh({ builtins })
  return { error, hsh, output, process, source }
}

describe('source builtin', () => {
  it('retains variables, aliases, and working-directory changes in the current shell', async () => {
    const { hsh, output, process } = createShell()

    await expect(hsh(
      process,
      'hsh',
      '-c',
      'source setup.hsh; echo $NAME; hi; pwd',
    )).resolves.toBe(0)

    expect(output.content).toBe('inside\nhello\n/work\n')
    expect(process.env.NAME).toBe('inside')
    expect(process.aliases.get('hi')).toBe('echo hello')
    expect(process.cwd).toBe('/work')
  })

  it('supports dot syntax and searches PATH before the current directory', async () => {
    const { hsh, output, process } = createShell()

    await expect(hsh(process, 'hsh', '-c', '. config; echo $FROM_PATH')).resolves.toBe(0)

    expect(output.content).toBe('yes\n')
  })

  it('temporarily replaces positional parameters when arguments are supplied', async () => {
    const { hsh, output, process } = createShell()

    await expect(hsh(
      process,
      'hsh',
      '-c',
      'set -- original; source arguments.hsh one two; echo "$1:$#"',
    )).resolves.toBe(0)

    expect(output.content).toBe('one:two:2\noriginal:1\n')
  })

  it('reports source paths for parse errors and restores positional parameters', async () => {
    const { error, process, source } = createShell()
    set(process, 'set', '--', 'original')

    await expect(source(process, 'source', 'broken.hsh', 'temporary')).resolves.toBe(1)

    expect(error.content).toContain('/home/broken.hsh: Expected command after then')
    expect(process.env['1']).toBe('original')
    expect(process.env['#']).toBe('1')
  })

  it('returns early through compound statements with an explicit status', async () => {
    const { hsh, output, process } = createShell()

    await expect(hsh(
      process,
      'hsh',
      '-c',
      'source early.hsh; echo source-status:$?',
    )).resolves.toBe(0)

    expect(output.content).toBe('before\nsource-status:7\n')
  })

  it('returns only from the innermost nested source call', async () => {
    const { hsh, output, process } = createShell()

    await expect(hsh(process, 'hsh', '-c', 'source outer.hsh')).resolves.toBe(0)

    expect(output.content).toBe([
      'outer-before',
      'inner-status:9',
      'outer-after',
      '',
    ].join('\n'))
  })

  it('uses the previous command status when return has no operand', async () => {
    const { hsh, output, process } = createShell()

    await expect(hsh(
      process,
      'hsh',
      '-c',
      'source default-return.hsh; echo source-status:$?',
    )).resolves.toBe(0)

    expect(output.content).toBe('source-status:1\n')
  })

  it('returns through a loop boundary', async () => {
    const { hsh, output, process } = createShell()

    await expect(hsh(
      process,
      'hsh',
      '-c',
      'source loop-return.hsh; echo source-status:$?',
    )).resolves.toBe(0)

    expect(output.content).toBe('source-status:4\n')
  })

  it('returns status 2 for a non-numeric operand', async () => {
    const { error, hsh, output, process } = createShell()

    await expect(hsh(
      process,
      'hsh',
      '-c',
      'source invalid-return.hsh; echo source-status:$?',
    )).resolves.toBe(0)

    expect(output.content).toBe('source-status:2\n')
    expect(error.content).toContain('nope: numeric argument required')
  })

  it('reports return outside a sourced script without exiting the shell', async () => {
    const { error, hsh, output, process } = createShell()

    await expect(hsh(
      process,
      'hsh',
      '-c',
      'return 3; echo survived:$?',
    )).resolves.toBe(0)

    expect(output.content).toBe('survived:1\n')
    expect(error.content).toContain('return: only meaningful in a function or sourced script')
  })
})
