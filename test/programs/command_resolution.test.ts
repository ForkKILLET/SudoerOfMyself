import { describe, expect, it } from 'vitest'
import { createCommandBuiltin } from '@/programs/command'
import { BuiltinRegistry } from '@/programs/resolve_command'
import { createTypeCommand } from '@/programs/type'
import { Context } from '@/sys0/context'
import { ExecService } from '@/sys0/exec'
import { FRead, Fs, FWrite } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import { Process } from '@/sys0/proc'
import { Program } from '@/sys0/program'
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

const noop: Program = () => 0

const createShell = () => {
  const output = new MemoryOutput()
  const error = new MemoryOutput()
  const fs = new Fs(Vfs.dir({
    bin: Vfs.dir({
      tool: Vfs.nativeExe('tool'),
      unavailable: Vfs.nativeExe('unavailable'),
      plain: Vfs.normal('text'),
    }),
  }), { persistence: new MemoryFsPersistence() })
  const context = {
    fs,
    exec: new ExecService(fs, { tool: noop }),
    processes: new ProcessTable(),
  } as Context
  const shell = new Process(context, null, {
    name: 'hsh',
    env: { HOME: '/', PATH: '/bin', PWD: '/' },
    stdio: new Stdio(new EmptyInput(), output, error),
  })
  return { error, output, shell }
}

const createCommands = () => {
  const builtins: Record<string, Program> = { echo: noop }
  const getBuiltins = (): BuiltinRegistry => builtins
  const type = createTypeCommand(getBuiltins)
  const command = createCommandBuiltin(getBuiltins)
  builtins.type = type
  builtins.command = command
  return { command, type }
}

describe('shell command introspection', () => {
  it('type distinguishes builtins and executable files', async () => {
    const { output, shell } = createShell()
    const { type } = createCommands()

    await expect(type(shell, 'type', 'echo', 'tool')).resolves.toBe(0)

    expect(output.content).toBe(
      'echo is a shell builtin\n' +
      'tool is /bin/tool\n',
    )
  })

  it('type identifies shell reserved words before command lookup', async () => {
    const { output, shell } = createShell()
    const { type } = createCommands()

    await expect(type(shell, 'type', 'if', 'then', 'in', '[[', ']]', 'time')).resolves.toBe(0)

    expect(output.content).toBe(
      'if is a reserved word\n' +
      'then is a reserved word\n' +
      'in is a reserved word\n' +
      '[[ is a reserved word\n' +
      ']] is a reserved word\n' +
      'time is a reserved word\n',
    )
  })

  it('type reports resolution failures and returns a failure status', async () => {
    const { error, shell } = createShell()
    const { type } = createCommands()

    await expect(type(shell, 'type', 'missing', 'toString', 'unavailable', 'plain')).resolves.toBe(1)

    expect(error.content).toContain('missing: not found')
    expect(error.content).toContain('toString: not found')
    expect(error.content).toContain('native program \'unavailable\' is unavailable')
    expect(error.content).toContain('/bin/plain: not executable')
  })

  it('command -v prints script-friendly resolutions and stays quiet for misses', async () => {
    const { error, output, shell } = createShell()
    const { command } = createCommands()

    await expect(command(shell, 'command', '-v', 'echo', 'tool', 'missing')).resolves.toBe(1)

    expect(output.content).toBe('echo\n/bin/tool\n')
    expect(error.content).toBe('')
  })

  it('command -v prints reserved words verbatim', async () => {
    const { output, shell } = createShell()
    const { command } = createCommands()

    await expect(command(shell, 'command', '-v', 'if', 'do', 'done', '[[', 'time')).resolves.toBe(0)

    expect(output.content).toBe('if\ndo\ndone\n[[\ntime\n')
  })
})
