import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatProcessTime, ps } from '@/programs/ps'
import { Context } from '@/sys0/context'
import { FRead, FWrite } from '@/sys0/fs'
import { Process } from '@/sys0/proc'
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

const deferred = <T>() => {
  let resolve: (value: T) => void = value => void value
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

describe('ps', () => {
  afterEach(() => vi.restoreAllMocks())

  it('reports the active process table including itself', async () => {
    let now = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const output = new MemoryOutput()
    const context = { processes: new ProcessTable() } as Context
    const root = new Process(context, null, {
      name: 'init',
      env: { HOME: '/', PATH: '/bin', PWD: '/' },
      stdio: new Stdio(new EmptyInput(), output),
    })
    const longExit = deferred<number>()
    now = 2000
    const longRunning = root.spawn(() => longExit.promise, { name: 'long-running' })

    now = 15_000
    await root.spawn(ps, { name: 'ps' })

    expect(output.content).toBe(
      '    PID     TIME CMD\n' +
      '      1 00:00:14 init\n' +
      '      2 00:00:13 long-running\n' +
      '      3 00:00:00 ps\n',
    )

    longExit.resolve(0)
    await longRunning
  })

  it('formats process time with an optional day prefix', () => {
    expect(formatProcessTime(999)).toBe('00:00:00')
    expect(formatProcessTime(93_784_999)).toBe('1-02:03:04')
  })
})
