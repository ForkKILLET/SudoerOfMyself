import { describe, expect, it } from 'vitest'
import { exportEnv } from '@/programs/export'
import { createEnvCommand } from '@/programs/env'
import { executeScript } from '@/programs/hsh'
import { parseLine } from '@/programs/hsh/parse'
import { printenv } from '@/programs/printenv'
import { read } from '@/programs/read'
import { readonly } from '@/programs/readonly'
import { unset } from '@/programs/unset'
import { Context } from '@/sys0/context'
import { FRead, FWrite } from '@/sys0/fs'
import { createPipe } from '@/sys0/pipe'
import { Process } from '@/sys0/proc'
import { signalExit } from '@/sys0/process_exit'
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

const createShell = (input: FRead = new EmptyInput()) => {
  const output = new MemoryOutput()
  const error = new MemoryOutput()
  const context = { processes: new ProcessTable() } as Context
  const shell = new Process(context, null, {
    name: 'hsh',
    env: { HOME: '/', PATH: '/bin', PWD: '/' },
    stdio: new Stdio(input, output, error),
  })
  return { error, output, shell }
}

describe('environment builtins', () => {
  it('exports values, preserves embedded equals signs, and passes them to children', async () => {
    const { shell } = createShell()

    await expect(exportEnv(shell, 'export', 'TOKEN=left=right', 'EMPTY')).resolves.toBe(0)
    const child = shell.fork({ name: 'child' })

    expect(shell.env.TOKEN).toBe('left=right')
    expect(shell.env.EMPTY).toBe('')
    expect(child.env.TOKEN).toBe('left=right')
  })

  it('does not pass unexported shell variables to children', () => {
    const { shell } = createShell()
    shell.variables.set('LOCAL_ONLY', 'secret')

    const child = shell.fork({ name: 'child' })

    expect(shell.env.LOCAL_ONLY).toBe('secret')
    expect(child.env.LOCAL_ONLY).toBeUndefined()
  })

  it('exports an existing shell variable without replacing its value', async () => {
    const { shell } = createShell()
    shell.variables.set('EXISTING', 'value')

    await expect(exportEnv(shell, 'export', 'EXISTING')).resolves.toBe(0)

    expect(shell.fork({ name: 'child' }).env.EXISTING).toBe('value')
  })

  it('unsets values and reports invalid names', async () => {
    const { error, shell } = createShell()
    shell.env.REMOVE_ME = 'yes'

    await expect(unset(shell, 'unset', 'REMOVE_ME')).resolves.toBe(0)
    await expect(exportEnv(shell, 'export', 'not-valid=value')).resolves.toBe(1)

    expect(shell.env.REMOVE_ME).toBeUndefined()
    expect(error.content).toContain('invalid environment variable name')
  })

  it('removes export attributes without removing shell values', async () => {
    const { output, shell } = createShell()
    await exportEnv(shell, 'export', 'VISIBLE=value')

    await expect(exportEnv(shell, 'export', '-n', 'VISIBLE')).resolves.toBe(0)
    await expect(printenv(shell, 'printenv', 'VISIBLE')).resolves.toBe(1)

    expect(shell.env.VISIBLE).toBe('value')
    expect(shell.fork({ name: 'child' }).env.VISIBLE).toBeUndefined()
    expect(output.content).toBe('')
  })

  it('runs env commands with temporary or empty exported environments', async () => {
    const { shell } = createShell()
    shell.variables.set('LOCAL_ONLY', 'hidden')
    shell.variables.set('EXPORTED', 'outer', { exported: true })
    const observed: Record<string, string>[] = []
    const inspect = (child: Process) => {
      observed.push({ ...child.env })
      return 0
    }
    const env = createEnvCommand(() => ({ inspect }))

    await expect(env(shell, 'env', 'EXPORTED=inner', 'TEMP=value', 'inspect'))
      .resolves.toMatchObject({ code: 0 })
    await expect(env(shell, 'env', '-i', 'TEMP=clean', 'inspect'))
      .resolves.toMatchObject({ code: 0 })

    expect(observed[0]).toMatchObject({ EXPORTED: 'inner', TEMP: 'value' })
    expect(observed[0].LOCAL_ONLY).toBeUndefined()
    expect(observed[1]).toEqual({ TEMP: 'clean', PWD: '/' })
    expect(shell.env.EXPORTED).toBe('outer')
    expect(shell.env.TEMP).toBeUndefined()
  })

  it('enforces readonly variables across assignment and unset paths', async () => {
    const { error, shell } = createShell()

    await expect(readonly(shell, 'readonly', 'LOCKED=one')).resolves.toBe(0)
    await expect(exportEnv(shell, 'export', 'LOCKED=two')).resolves.toBe(1)
    await expect(unset(shell, 'unset', 'LOCKED')).resolves.toBe(1)
    const assignment = await executeScript(
      shell,
      parseLine('LOCKED=three', shell.env),
      {},
    )

    expect(assignment.code).toBe(1)
    expect(shell.env.LOCKED).toBe('one')
    expect(shell.variables.isReadonly('LOCKED')).toBe(true)
    expect(error.content.match(/readonly variable/g)).toHaveLength(3)
  })

  it('reads fields from a pipe and assigns the remainder to the last name', async () => {
    const pipe = createPipe()
    const { shell } = createShell(pipe.reader)
    pipe.writer.writeLn('one two three four')

    await expect(read(shell, 'read', 'FIRST', 'REST')).resolves.toBe(0)

    expect(shell.env.FIRST).toBe('one')
    expect(shell.env.REST).toBe('two three four')
  })

  it('uses REPLY by default and returns failure at EOF', async () => {
    const pipe = createPipe()
    const { shell } = createShell(pipe.reader)
    pipe.writer.write('unterminated input')
    pipe.writer.close()

    await expect(read(shell, 'read')).resolves.toBe(1)
    expect(shell.env.REPLY).toBe('unterminated input')
  })

  it('can be interrupted while waiting for input', async () => {
    const pipe = createPipe()
    const { shell } = createShell(pipe.reader)
    const running = read(shell, 'read', 'VALUE')

    shell.sendSignal('SIGTERM')

    await expect(running).resolves.toEqual(signalExit('SIGTERM'))
    expect(shell.env.VALUE).toBeUndefined()
  })
})
