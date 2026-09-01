import { describe, expect, it, vi } from 'vitest'
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
import { jobs } from '@/programs/jobs'
import { wait } from '@/programs/wait'

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

const deferred = <T>() => {
  let resolve: (value: T) => void = value => void value
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
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
      redirections: [{ fd: 2, type: 'writeTo', path: '/errors.txt' }],
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
      redirections: [{ fd: 1, type: 'writeTo', path: '/output.txt' }],
    }, {})

    expect(output.content).toBe('')
    expect(error.content).toBe('mixed: failure\n')
    expect(fs.openU('/output.txt', 'r').handle.read()).toBe('ordinary output\n')
  })

  it('applies repeated redirects from left to right', async () => {
    const { fs, process } = createShellProcess((child) => {
      child.stdio.write('payload')
      return 0
    })

    await execute(process, {
      name: 'producer',
      args: [],
      redirections: [
        { fd: 1, type: 'writeTo', path: '/first.txt' },
        { fd: 1, type: 'writeTo', path: '/second.txt' },
      ],
    }, {})

    expect(fs.openU('/first.txt', 'r').handle.read()).toBe('')
    expect(fs.openU('/second.txt', 'r').handle.read()).toBe('payload')
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
    process.signalForeground('SIGINT')
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

  it('starts a background job without making it a foreground child', async () => {
    const finished = deferred<number>()
    const backgroundSignal = vi.fn()
    const shellSignal = vi.fn()
    const { output, process } = createShellProcess((child) => {
      child.on('signal', backgroundSignal)
      return finished.promise
    })
    process.on('signal', shellSignal)

    await executeScript(process, {
      commands: [{ name: 'long-running', args: [] }],
      background: true,
    }, {}, { source: 'long-running &' })

    const job = process.jobTable?.get(1)
    const child = process.subProcesses[0]
    expect(output.content).toBe(`[1] ${child.pid}\n`)
    expect(process.env['!']).toBe(child.pid.toString())
    expect(process.env['?']).toBe('0')
    expect(child.isForeground).toBe(false)
    expect(job?.group.values()).toEqual([child])

    process.signalForeground('SIGINT')
    expect(shellSignal).toHaveBeenCalledWith('SIGINT')
    expect(backgroundSignal).not.toHaveBeenCalled()

    finished.resolve(7)
    await job?.completion
    expect(job?.state).toBe('completed')
    expect(job?.exitStatus?.code).toBe(7)
    expect(job?.group.size).toBe(0)
  })

  it('reports completed jobs and wait removes them', async () => {
    const finished = deferred<number>()
    const { output, process } = createShellProcess(() => finished.promise)

    await executeScript(process, {
      commands: [{ name: 'long-running', args: [] }],
      background: true,
    }, {}, { source: 'long-running &' })
    finished.resolve(9)
    await process.jobTable?.get(1)?.completion

    await executeScript(process, {
      commands: [{ name: 'jobs', args: [] }],
    }, { jobs })
    expect(output.content).toContain('[1] Done (9)')

    await executeScript(process, {
      commands: [{ name: 'wait', args: ['%1'] }],
    }, { wait })
    expect(process.env['?']).toBe('9')
    expect(process.jobTable?.values()).toEqual([])
  })

  it('gives a background command EOF instead of the interactive stdin', async () => {
    const { process } = createShellProcess(async (child) => {
      expect(await child.stdio.read()).toBe('')
      return 0
    })

    await executeScript(process, {
      commands: [{ name: 'reader', args: [] }],
      background: true,
    }, {})

    await process.jobTable?.get(1)?.completion
    expect(process.jobTable?.get(1)?.state).toBe('completed')
  })

  it('puts every background pipeline stage in the same process group', async () => {
    const releaseProducer = deferred<number>()
    const { output, process } = createShellProcess({
      producer: (child) => {
        child.stdio.write('streamed')
        return releaseProducer.promise
      },
      consumer: async (child) => {
        child.stdio.write(await child.stdio.read())
        return 0
      },
    })

    await executeScript(process, {
      commands: [
        { name: 'producer', args: [], pipeToNext: true },
        { name: 'consumer', args: [] },
      ],
      background: true,
    }, {})

    const job = process.jobTable?.get(1)
    expect(job?.group.values().map(member => member.name).sort()).toEqual(['consumer', 'producer'])

    releaseProducer.resolve(0)
    await job?.completion
    expect(output.content).toContain('streamed')
  })

  it('interrupts wait without interrupting the job being waited for', async () => {
    const finished = deferred<number>()
    const backgroundSignal = vi.fn()
    const { output, process } = createShellProcess((child) => {
      child.on('signal', backgroundSignal)
      return finished.promise
    })
    await executeScript(process, {
      commands: [{ name: 'long-running', args: [] }],
      background: true,
    }, {})

    const waiting = executeScript(process, {
      commands: [{ name: 'wait', args: [] }],
    }, { wait })
    process.signalForeground('SIGINT')
    await waiting

    expect(process.env['?']).toBe('130')
    expect(output.content.endsWith('\n\n')).toBe(true)
    expect(backgroundSignal).not.toHaveBeenCalled()
    expect(process.jobTable?.get(1)?.state).toBe('running')

    finished.resolve(0)
    await process.jobTable?.get(1)?.completion
  })
})
