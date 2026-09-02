import { describe, expect, it, vi } from 'vitest'
import { Err, Ok } from 'fk-result'
import { execute, executeScript } from '@/programs/hsh'
import { parseLine } from '@/programs/hsh/parse'
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
import { ExecErrorT } from '@/sys0/exec'

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

  it('temporarily applies command-prefix assignments to builtins', async () => {
    let observed: [string, string] | undefined
    const { process } = createShellProcess(() => 0)
    process.env.var = 'outer'
    const inspect: Program = (proc, _self, argument) => {
      observed = [proc.env.var, argument]
      proc.env.SIDE_EFFECT = 'preserved'
      return 0
    }

    await executeScript(
      process,
      parseLine('var=temporary inspect $var', process.env),
      { inspect },
    )

    expect(observed).toEqual(['temporary', 'outer'])
    expect(process.env.var).toBe('outer')
    expect(process.env.SIDE_EFFECT).toBe('preserved')
  })

  it('applies sequential command-prefix assignments to the command environment', async () => {
    let observed: string[] | undefined
    const { process } = createShellProcess(() => 0)
    process.variables.set('a', 'outer')
    process.variables.set('b', 'outer-b')
    const inspect: Program = (proc, _self, ...args) => {
      observed = [proc.env.a, proc.env.b, ...args]
      return 0
    }

    await executeScript(
      process,
      parseLine('a=inner b=$a inspect $a $b', process.env),
      { inspect },
    )

    expect(observed).toEqual(['inner', 'inner', 'outer', 'outer-b'])
    expect(process.env.a).toBe('outer')
    expect(process.env.b).toBe('outer-b')
  })

  it('persists assignments without a command in the current shell', async () => {
    const { process } = createShellProcess(() => 0)
    process.env.first = 'old'

    await executeScript(
      process,
      parseLine('first=one second=$first EMPTY=', process.env),
      {},
    )

    expect(process.env.first).toBe('one')
    expect(process.env.second).toBe('one')
    expect(process.env.EMPTY).toBe('')
    expect(process.env['?']).toBe('0')
    expect(process.fork({ name: 'child' }).env.first).toBeUndefined()
  })

  it('uses command-prefix assignments for executable lookup and child environments', async () => {
    let childPath: string | undefined
    const { process } = createShellProcess((child) => {
      childPath = child.env.PATH
      return 0
    })
    const resolve = vi.fn(process.ctx.exec.resolve.bind(process.ctx.exec))
    process.ctx.exec.resolve = resolve

    await executeScript(
      process,
      parseLine('PATH=/temporary/bin external', process.env),
      {},
    )

    expect(resolve).toHaveBeenCalledWith('external', {
      envPath: '/temporary/bin',
      cwd: '/',
    })
    expect(childPath).toBe('/temporary/bin')
    expect(process.env.PATH).toBe('/bin')
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

  it('makes descriptor duplication order observable', async () => {
    const program: Program = (child) => {
      child.stdio.write('stdout')
      child.stdio.writeError('stderr')
      return 0
    }
    const first = createShellProcess(program)
    await execute(first.process, {
      name: 'mixed',
      args: [],
      redirections: [
        { fd: 2, type: 'duplicate', sourceFd: 1 },
        { fd: 1, type: 'writeTo', path: '/first.txt' },
      ],
    }, {})
    expect(first.output.content).toBe('stderr')
    expect(first.fs.openU('/first.txt', 'r').handle.read()).toBe('stdout')

    const second = createShellProcess(program)
    await execute(second.process, {
      name: 'mixed',
      args: [],
      redirections: [
        { fd: 1, type: 'writeTo', path: '/second.txt' },
        { fd: 2, type: 'duplicate', sourceFd: 1 },
      ],
    }, {})
    expect(second.output.content).toBe('')
    expect(second.fs.openU('/second.txt', 'r').handle.read()).toBe('stdoutstderr')
  })

  it('installs, duplicates, and closes descriptors beyond stderr', async () => {
    const { fs, process } = createShellProcess((child) => {
      child.stdio.fds.getWritable(3).unwrap().write('first')
      child.stdio.fds.getWritable(4).unwrap().write(' second')
      expect(child.stdio.fds.has(5)).toBe(false)
      return 0
    })

    await execute(process, {
      name: 'fd-writer',
      args: [],
      redirections: [
        { fd: 3, type: 'writeTo', path: '/fd.txt' },
        { fd: 4, type: 'duplicate', sourceFd: 3 },
        { fd: 5, type: 'duplicate', sourceFd: 3 },
        { fd: 5, type: 'close' },
      ],
    }, {})

    expect(fs.openU('/fd.txt', 'r').handle.read()).toBe('first second')
  })

  it('applies stderr redirection to command resolution failures', async () => {
    const { error, fs, process } = createShellProcess(() => 0)
    process.ctx.exec = {
      resolve: () => Err({ type: ExecErrorT.NOT_FOUND }),
    } as unknown as Context['exec']

    const status = await execute(process, {
      name: 'missing',
      args: [],
      redirections: [{ fd: 2, type: 'writeTo', path: '/error.txt' }],
    }, {})

    expect(status.code).toBe(127)
    expect(error.content).toBe('')
    expect(fs.openU('/error.txt', 'r').handle.read()).toBe('missing: Command not found\n')
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

  it('keeps a pipe open while a descendant retains the writer descriptor', async () => {
    const release = deferred<number>()
    const { output, process } = createShellProcess({
      producer: (child) => {
        void child.spawn(async (descendant) => {
          descendant.stdio.write('late output')
          return release.promise
        }, { name: 'descendant' })
        return 0
      },
      consumer: async (child) => {
        child.stdio.write(await child.stdio.read())
        return 0
      },
    })
    let completed = false

    const running = executeScript(process, {
      commands: [
        { name: 'producer', args: [], pipeToNext: true },
        { name: 'consumer', args: [] },
      ],
    }, {}).then(() => {
      completed = true
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(completed).toBe(false)

    release.resolve(0)
    await running
    expect(output.content).toBe('late output')
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

  it('prints the background job banner before immediate child output', async () => {
    const { output, process } = createShellProcess((child) => {
      child.stdio.writeLn('child output')
      return 0
    })

    await executeScript(process, {
      commands: [{ name: 'immediate', args: [] }],
      background: true,
    }, {}, { source: 'immediate &' })
    await process.jobTable?.get(1)?.completion

    const childPid = process.env['!']
    expect(output.content).toBe(`[1] ${childPid}\nchild output\n`)
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
