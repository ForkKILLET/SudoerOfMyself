import { describe, expect, it, vi } from 'vitest'
import { Context } from '@/sys0/context'
import { FRead, FWrite } from '@/sys0/fs'
import { Process } from '@/sys0/proc'
import { Stdio } from '@/sys0/stdio'
import { normalExit, signalExit } from '@/sys0/process_exit'
import { ProcessTable } from '@/sys0/process_table'

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

const createRootProcess = () => {
  const processes = new ProcessTable()
  const context = { processes } as Context
  const stdio = new Stdio(new EmptyInput(), new MemoryOutput())
  const root = new Process(context, null, {
    name: 'init',
    env: { HOME: '/', PATH: '/bin', PWD: '/' },
    stdio,
  })
  return { processes, root }
}

describe('Process lifecycle', () => {
  it('removes the child that exited instead of the newest child', async () => {
    const { root } = createRootProcess()
    const firstExit = deferred<number>()
    const secondExit = deferred<number>()

    const firstRun = root.spawn(() => firstExit.promise, { name: 'first' })
    const first = root.subProcesses[0]
    const secondRun = root.spawn(() => secondExit.promise, { name: 'second' })
    const second = root.subProcesses[0]

    expect(root.subProcesses.map(process => process.name)).toEqual(['second', 'first'])
    firstExit.resolve(3)
    await expect(firstRun).resolves.toEqual(normalExit(3))

    expect(root.subProcesses).toEqual([second])
    expect(first.state).toBe('exited')
    expect(first.exitCode).toBe(3)

    secondExit.resolve(4)
    await expect(secondRun).resolves.toEqual(normalExit(4))
    expect(root.subProcesses).toEqual([])
  })

  it('inherits stdio and directs terminal signals to the deepest foreground child', () => {
    const { root } = createRootProcess()
    const child = root.fork({ name: 'child' })
    const grandchild = child.fork({ name: 'grandchild' })
    const rootSignal = vi.fn()
    const childSignal = vi.fn()
    const grandchildSignal = vi.fn()

    root.on('signal', rootSignal)
    child.on('signal', childSignal)
    grandchild.on('signal', grandchildSignal)
    root.signalForeground('SIGINT')

    expect(child.stdio).toBe(root.stdio)
    expect(grandchild.stdio).toBe(root.stdio)
    expect(rootSignal).not.toHaveBeenCalled()
    expect(childSignal).not.toHaveBeenCalled()
    expect(grandchildSignal).toHaveBeenCalledOnce()
    expect(grandchildSignal).toHaveBeenCalledWith('SIGINT')
  })

  it('broadcasts terminal signals to sibling foreground processes', () => {
    const { root } = createRootProcess()
    const first = root.fork({ name: 'first' })
    const second = root.fork({ name: 'second' })
    const firstSignal = vi.fn()
    const secondSignal = vi.fn()
    first.on('signal', firstSignal)
    second.on('signal', secondSignal)

    root.signalForeground('SIGINT')

    expect(firstSignal).toHaveBeenCalledWith('SIGINT')
    expect(secondSignal).toHaveBeenCalledWith('SIGINT')
  })

  it('delivers an explicit signal only to the addressed process', () => {
    const { root } = createRootProcess()
    const child = root.fork({ name: 'child' })
    const rootSignal = vi.fn()
    const childSignal = vi.fn()
    root.on('signal', rootSignal)
    child.on('signal', childSignal)

    root.sendSignal('SIGTERM')

    expect(rootSignal).toHaveBeenCalledWith('SIGTERM')
    expect(childSignal).not.toHaveBeenCalled()
    child.sendSignal('SIGKILL')
    expect(childSignal).toHaveBeenCalledWith('SIGKILL')
  })

  it('publishes the exit status exactly once', async () => {
    const { root } = createRootProcess()
    const onExit = vi.fn()
    const run = root.spawn((process) => {
      process.on('exit', onExit)
      return 7
    }, { name: 'program' })

    await expect(run).resolves.toEqual(normalExit(7))
    expect(onExit).toHaveBeenCalledOnce()
    expect(onExit).toHaveBeenCalledWith(normalExit(7))
  })

  it('preserves a signal exit through nested processes', async () => {
    const { root } = createRootProcess()

    const run = root.spawn(
      process => process.spawn(() => signalExit('SIGINT'), { name: 'inner' }),
      { name: 'outer' },
    )

    await expect(run).resolves.toEqual(signalExit('SIGINT'))
  })

  it('assigns stable PIDs and removes exited processes from the active table', async () => {
    const { processes, root } = createRootProcess()
    const childExit = deferred<number>()
    const running = root.spawn(() => childExit.promise, { name: 'child' })
    const child = root.subProcesses[0]

    expect(root.pid).toBe(1)
    expect(root.ppid).toBe(0)
    expect(child.pid).toBe(2)
    expect(child.ppid).toBe(root.pid)
    expect(processes.get(child.pid)).toBe(child)

    childExit.resolve(0)
    await running

    expect(processes.has(child.pid)).toBe(false)
    expect(processes.values()).toEqual([root])
  })
})
