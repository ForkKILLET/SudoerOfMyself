import { describe, expect, it, vi } from 'vitest'
import { Context } from '@/sys0/context'
import { FRead, FWrite } from '@/sys0/fs'
import { JobTable, ProcessGroup } from '@/sys0/job'
import { Process } from '@/sys0/proc'
import { normalExit, ProcessExit } from '@/sys0/process_exit'
import { ProcessTable } from '@/sys0/process_table'
import { Stdio } from '@/sys0/stdio'

class EmptyInput implements FRead {
  readKey() { return '\x04' }
  read() { return '' }
  readUntil() { return '' }
  readLn() { return '' }
}

class NullOutput implements FWrite {
  write() {}
  writeLn() {}
}

const deferred = <T>() => {
  let resolve: (value: T) => void = value => void value
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

const createRoot = () => {
  const context = { processes: new ProcessTable() } as Context
  return new Process(context, null, {
    name: 'init',
    env: { HOME: '/', PATH: '/bin', PWD: '/' },
    stdio: new Stdio(new EmptyInput(), new NullOutput()),
  })
}

describe('ProcessGroup', () => {
  it('tracks members and isolates a background child from parent interrupts', async () => {
    const root = createRoot()
    const group = new ProcessGroup()
    const childExit = deferred<number>()
    const childInterrupt = vi.fn()
    const rootInterrupt = vi.fn()
    const running = root.spawn((child) => {
      child.on('interrupt', childInterrupt)
      return childExit.promise
    }, {
      name: 'background',
      processGroup: group,
      foreground: false,
    })
    const child = root.subProcesses[0]

    expect(group.pgid).toBe(child.pid)
    expect(group.values()).toEqual([child])

    root.on('interrupt', rootInterrupt)
    root.interrupt()
    expect(rootInterrupt).toHaveBeenCalledOnce()
    expect(childInterrupt).not.toHaveBeenCalled()

    group.interrupt()
    expect(childInterrupt).toHaveBeenCalledOnce()

    childExit.resolve(0)
    await running
    expect(group.size).toBe(0)
    expect(group.pgid).toBe(child.pid)
  })
})

describe('JobTable', () => {
  it('retains completion state independently from active processes', async () => {
    const table = new JobTable()
    const completion = deferred<ProcessExit>()
    const job = table.create(new ProcessGroup(), 'example &', completion.promise)

    expect(job.id).toBe(1)
    expect(job.state).toBe('running')

    completion.resolve(normalExit(7))
    await job.completion

    expect(job.state).toBe('completed')
    expect(job.exitStatus).toEqual(normalExit(7))
    expect(table.values()).toEqual([job])
  })
})
