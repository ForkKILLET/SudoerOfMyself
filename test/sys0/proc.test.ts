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

  it('inherits stdio and directs interrupts to the deepest foreground child', () => {
    const { root } = createRootProcess()
    const child = root.fork({ name: 'child' })
    const grandchild = child.fork({ name: 'grandchild' })
    const rootInterrupt = vi.fn()
    const childInterrupt = vi.fn()
    const grandchildInterrupt = vi.fn()

    root.on('interrupt', rootInterrupt)
    child.on('interrupt', childInterrupt)
    grandchild.on('interrupt', grandchildInterrupt)
    root.interrupt()

    expect(child.stdio).toBe(root.stdio)
    expect(grandchild.stdio).toBe(root.stdio)
    expect(rootInterrupt).not.toHaveBeenCalled()
    expect(childInterrupt).not.toHaveBeenCalled()
    expect(grandchildInterrupt).toHaveBeenCalledOnce()
  })

  it('broadcasts interrupts to sibling foreground processes', () => {
    const { root } = createRootProcess()
    const first = root.fork({ name: 'first' })
    const second = root.fork({ name: 'second' })
    const firstInterrupt = vi.fn()
    const secondInterrupt = vi.fn()
    first.on('interrupt', firstInterrupt)
    second.on('interrupt', secondInterrupt)

    root.interrupt()

    expect(firstInterrupt).toHaveBeenCalledOnce()
    expect(secondInterrupt).toHaveBeenCalledOnce()
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
