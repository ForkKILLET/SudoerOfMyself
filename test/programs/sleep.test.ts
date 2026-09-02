import { afterEach, describe, expect, it, vi } from 'vitest'
import { sleep } from '@/programs/sleep'
import { Context } from '@/sys0/context'
import { FRead, FWrite } from '@/sys0/fs'
import { Process } from '@/sys0/proc'
import { normalExit, signalExit } from '@/sys0/process_exit'
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

const createRoot = () => {
  const context = { processes: new ProcessTable() } as Context
  return new Process(context, null, {
    name: 'init',
    env: { HOME: '/', PATH: '/bin', PWD: '/' },
    stdio: new Stdio(new EmptyInput(), new NullOutput()),
  })
}

afterEach(() => vi.useRealTimers())

describe('sleep program', () => {
  it('completes after the requested duration', async () => {
    vi.useFakeTimers()
    const root = createRoot()
    const running = root.spawn(sleep, { name: 'sleep' }, '2.5')

    await vi.advanceTimersByTimeAsync(2499)
    expect(root.subProcesses).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1)

    await expect(running).resolves.toEqual(normalExit(0))
    expect(root.subProcesses).toEqual([])
  })

  it('accepts duration suffixes', async () => {
    vi.useFakeTimers()
    const root = createRoot()
    const running = root.spawn(sleep, { name: 'sleep' }, '1.5m')

    await vi.advanceTimersByTimeAsync(89_999)
    expect(root.subProcesses).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1)

    await expect(running).resolves.toEqual(normalExit(0))
  })

  it('cancels the timer and exits through a signal', async () => {
    vi.useFakeTimers()
    const root = createRoot()
    const running = root.spawn(sleep, { name: 'sleep' }, '100')
    const child = root.subProcesses[0]

    child.sendSignal('SIGTERM')

    await expect(running).resolves.toEqual(signalExit('SIGTERM'))
    expect(root.subProcesses).toEqual([])
    expect(vi.getTimerCount()).toBe(0)
  })
})
