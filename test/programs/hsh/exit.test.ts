import { describe, expect, it, vi } from 'vitest'
import { exit } from '@/programs/exit'
import { createHsh, executeScript } from '@/programs/hsh'
import { getShellExitRequest } from '@/programs/hsh/control'
import { Context } from '@/sys0/context'
import { FRead, Fs, FWrite } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import { Process } from '@/sys0/proc'
import { normalExit } from '@/sys0/process_exit'
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
    fs: new Fs(Vfs.dir({ home: Vfs.dir() }), { persistence: new MemoryFsPersistence() }),
    processes: new ProcessTable(),
  } as Context
  const shell = new Process(context, null, {
    name: 'hsh',
    env: { HOME: '/home', PATH: '/bin', PWD: '/home' },
    stdio: new Stdio(new EmptyInput(), output, error),
  })
  shell.env['?'] = '0'
  return { error, output, shell }
}

describe('exit builtin', () => {
  it('stops command-mode hsh and returns the requested status', async () => {
    const { shell } = createShell()
    const hsh = createHsh({ builtins: { exit } })

    await expect(hsh(shell, 'hsh', '-c', 'exit 23')).resolves.toEqual(normalExit(23))
    expect(getShellExitRequest(shell)).toEqual(normalExit(23))
  })

  it('returns syntax errors and the last command status from command mode', async () => {
    const syntaxError = createShell()
    const afterError = vi.fn(() => 0)
    const syntaxShell = createHsh({ builtins: { 'after-error': afterError } })

    await expect(syntaxShell(
      syntaxError.shell,
      'hsh',
      '-c',
      'echo "unfinished\nafter-error',
    )).resolves.toBe(2)
    expect(syntaxError.error.content).toContain('Unmatched double quote')
    expect(afterError).not.toHaveBeenCalled()

    const failedCommand = createShell()
    const statusShell = createHsh({ builtins: { fail: () => 7 } })
    await expect(statusShell(failedCommand.shell, 'hsh', '-c', 'fail')).resolves.toBe(7)
  })

  it('stops executing commands after a foreground exit request', async () => {
    const { shell } = createShell()
    const afterExit = vi.fn(() => 0)

    await executeScript(shell, {
      commands: [
        { name: 'exit', args: ['7'] },
        { name: 'after-exit', args: [] },
      ],
    }, { exit, 'after-exit': afterExit })

    expect(getShellExitRequest(shell)).toEqual(normalExit(7))
    expect(afterExit).not.toHaveBeenCalled()
  })

  it('normalizes numeric status and rejects excess arguments without exiting', async () => {
    const first = createShell()
    await expect(exit(first.shell, 'exit', '-1')).resolves.toEqual(normalExit(255))

    const second = createShell()
    await expect(exit(second.shell, 'exit', '1', '2')).resolves.toBe(1)
    expect(getShellExitRequest(second.shell)).toBeUndefined()
    expect(second.error.content).toContain('Too many arguments')
  })

  it('exits only the spawned child when used as a background builtin', async () => {
    const { shell } = createShell()

    await executeScript(shell, {
      commands: [{ name: 'exit', args: ['9'] }],
      background: true,
    }, { exit })

    await expect(shell.jobTable?.get(1)?.completion).resolves.toEqual(normalExit(9))
    expect(getShellExitRequest(shell)).toBeUndefined()
  })

  it('exits with status 2 for a non-numeric operand', async () => {
    const { error, shell } = createShell()

    await expect(exit(shell, 'exit', 'nope')).resolves.toEqual(normalExit(2))
    expect(error.content).toContain('numeric argument required')
  })
})
