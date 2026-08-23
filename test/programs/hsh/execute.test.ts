import { describe, expect, it } from 'vitest'
import { Ok } from 'fk-result'
import { execute } from '@/programs/hsh'
import { Context } from '@/sys0/context'
import { FRead, Fs, FWrite } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import { Process } from '@/sys0/proc'
import { Program } from '@/sys0/program'
import { signalExit } from '@/sys0/process_exit'
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

const createShellProcess = (program: Program) => {
  const output = new MemoryOutput()
  const error = new MemoryOutput()
  const fs = new Fs(Vfs.dir({}), { persistence: new MemoryFsPersistence() })
  const context = {
    fs,
    exec: {
      resolve: () => Ok({ program }),
    },
  } as unknown as Context
  const process = new Process(context, null, {
    name: 'hsh',
    env: { HOME: '/', PATH: '/bin', PWD: '/' },
    stdio: new Stdio(new EmptyInput(), output, error),
  })
  return { error, fs, output, process }
}

describe('hsh execution', () => {
  it('writes a newline after a foreground command is interrupted', async () => {
    const { output, process } = createShellProcess(() => signalExit('SIGINT'))

    const exitCode = await execute(process, { name: 'interrupted', args: [] }, {})

    expect(exitCode).toBe(130)
    expect(output.content).toBe('\n')
  })

  it('does not treat an ordinary exit code 130 as a signal', async () => {
    const { output, process } = createShellProcess(() => 130)

    const exitCode = await execute(process, { name: 'ordinary', args: [] }, {})

    expect(exitCode).toBe(130)
    expect(output.content).toBe('')
  })

  it('redirects stderr independently from stdout', async () => {
    const { error, fs, output, process } = createShellProcess((child) => {
      child.stdio.writeLn('ordinary output')
      child.error('failure')
      return 1
    })

    await execute(process, {
      name: 'mixed',
      args: [],
      error: { type: 'writeTo', path: '/errors.txt' },
    }, {})

    expect(output.content).toBe('ordinary output\n')
    expect(error.content).toBe('')
    expect(fs.openU('/errors.txt', 'r').handle.read()).toBe('mixed: failure\n')
  })

  it('keeps stderr on the shell stream when only stdout is redirected', async () => {
    const { error, fs, output, process } = createShellProcess((child) => {
      child.stdio.writeLn('ordinary output')
      child.error('failure')
      return 1
    })

    await execute(process, {
      name: 'mixed',
      args: [],
      output: { type: 'writeTo', path: '/output.txt' },
    }, {})

    expect(output.content).toBe('')
    expect(error.content).toBe('mixed: failure\n')
    expect(fs.openU('/output.txt', 'r').handle.read()).toBe('ordinary output\n')
  })
})
