import { describe, expect, it } from 'vitest'
import { ps } from '@/programs/ps'
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
  it('reports the active process table including itself', async () => {
    const output = new MemoryOutput()
    const context = { processes: new ProcessTable() } as Context
    const root = new Process(context, null, {
      name: 'init',
      env: { HOME: '/', PATH: '/bin', PWD: '/' },
      stdio: new Stdio(new EmptyInput(), output),
    })
    const longExit = deferred<number>()
    const longRunning = root.spawn(() => longExit.promise, { name: 'long-running' })

    await root.spawn(ps, { name: 'ps' })

    expect(output.content).toBe(
      'PID PPID STATE   COMMAND\n' +
      '  1    0 running init\n' +
      '  2    1 running long-running\n' +
      '  3    1 running ps\n',
    )

    longExit.resolve(0)
    await longRunning
  })
})
