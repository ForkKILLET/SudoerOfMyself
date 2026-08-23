import { describe, expect, it } from 'vitest'
import { Ok } from 'fk-result'
import { execute, executeScript } from '@/programs/hsh'
import { Context } from '@/sys0/context'
import { FRead, Fs, FWrite } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import { Process } from '@/sys0/proc'
import { Program } from '@/sys0/program'
import { signalExit } from '@/sys0/process_exit'
import { ProcessTable } from '@/sys0/process_table'
import { Stdio } from '@/sys0/stdio'
import { createPipe } from '@/sys0/pipe'
import { cat } from '@/programs/cat'

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

const createShellProcess = (programs: Program | Record<string, Program>) => {
  const output = new MemoryOutput()
  const error = new MemoryOutput()
  const fs = new Fs(Vfs.dir({}), { persistence: new MemoryFsPersistence() })
  const context = {
    fs,
    processes: new ProcessTable(),
    exec: {
      resolve: (name: string) => Ok({
        program: typeof programs === 'function' ? programs : programs[name],
      }),
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

    await executeScript(process, {
      commands: [{ name: 'interrupted', args: [] }],
    }, {})

    expect(process.env['?']).toBe('130')
    expect(output.content).toBe('\n')
  })

  it('does not treat an ordinary exit code 130 as a signal', async () => {
    const { output, process } = createShellProcess(() => 130)

    await executeScript(process, {
      commands: [{ name: 'ordinary', args: [] }],
    }, {})

    expect(process.env['?']).toBe('130')
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

  it('runs pipeline stages concurrently and pipes only stdout', async () => {
    const { error, output, process } = createShellProcess({
      producer: (child) => {
        child.stdio.write('payload')
        child.error('diagnostic')
        return 4
      },
      consumer: async (child) => {
        const input = await child.stdio.read()
        child.stdio.write(input.toUpperCase())
        return 7
      },
    })

    await executeScript(process, {
      commands: [
        { name: 'producer', args: [], pipeToNext: true },
        { name: 'consumer', args: [] },
      ],
    }, {})

    expect(output.content).toBe('PAYLOAD')
    expect(error.content).toBe('producer: diagnostic\n')
    expect(process.env['?']).toBe('7')
  })

  it('writes only one newline when multiple pipeline stages receive SIGINT', async () => {
    const { output, process } = createShellProcess({
      first: () => signalExit('SIGINT'),
      second: () => signalExit('SIGINT'),
    })

    await executeScript(process, {
      commands: [
        { name: 'first', args: [], pipeToNext: true },
        { name: 'second', args: [] },
      ],
    }, {})

    expect(output.content).toBe('\n')
    expect(process.env['?']).toBe('130')
  })

  it('interrupts a pipeline stage blocked on input and lets the pipeline finish', async () => {
    const terminalInput = createPipe()
    const { output, process } = createShellProcess({
      cat,
      consume: async (child) => {
        await child.stdio.read()
        return 0
      },
    })
    process.stdio.input = terminalInput.reader

    const running = executeScript(process, {
      commands: [
        { name: 'cat', args: [], pipeToNext: true },
        { name: 'consume', args: [] },
      ],
    }, {})
    process.interrupt()
    await running

    expect(output.content).toBe('\n')
    expect(process.subProcesses).toEqual([])
  })

  it('runs a builtin pipeline stage in a child process', async () => {
    const { output, process } = createShellProcess({
      consume: async (child) => {
        child.stdio.write(await child.stdio.read())
        return 0
      },
    })
    const mutate: Program = (child) => {
      child.env.PIPE_CHILD = child.pid.toString()
      child.stdio.write('from builtin')
      return 0
    }

    await executeScript(process, {
      commands: [
        { name: 'mutate', args: [], pipeToNext: true },
        { name: 'consume', args: [] },
      ],
    }, { mutate })

    expect(output.content).toBe('from builtin')
    expect(process.env.PIPE_CHILD).toBeUndefined()
  })
})
