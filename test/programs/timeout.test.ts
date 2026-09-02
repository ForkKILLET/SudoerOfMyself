import { afterEach, describe, expect, it, vi } from 'vitest'
import { timeout } from '@/programs/timeout'
import { Context } from '@/sys0/context'
import { ExecService } from '@/sys0/exec'
import { FRead, Fs, FWrite } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import { Process } from '@/sys0/proc'
import { signalExit } from '@/sys0/process_exit'
import { type Program } from '@/sys0/program'
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

const createProcess = (task: Program) => {
  const fs = new Fs(Vfs.dir({
    bin: Vfs.dir({ task: Vfs.nativeExe('task') }),
  }), { persistence: new MemoryFsPersistence() })
  const context = {
    fs,
    exec: new ExecService(fs, { task }),
    processes: new ProcessTable(),
  } as Context
  return new Process(context, null, {
    name: 'timeout',
    env: { HOME: '/', PATH: '/bin', PWD: '/' },
    stdio: new Stdio(new EmptyInput(), new NullOutput()),
  })
}

afterEach(() => vi.useRealTimers())

describe('timeout', () => {
  it('signals the command process group and returns 124 at the deadline', async () => {
    vi.useFakeTimers()
    let receivedSignal = ''
    const process = createProcess(child => new Promise((resolve) => {
      child.on('signal', (signal) => {
        receivedSignal = signal
        resolve(signalExit(signal))
      })
    }))

    const running = timeout(process, 'timeout', '-s', 'KILL', '1s', 'task')
    await vi.advanceTimersByTimeAsync(1_000)

    await expect(running).resolves.toBe(124)
    expect(receivedSignal).toBe('SIGKILL')
    expect(process.subProcesses).toEqual([])
  })

  it('preserves a command status and clears the deadline when it finishes early', async () => {
    vi.useFakeTimers()
    const process = createProcess(() => 7)

    await expect(timeout(process, 'timeout', '10', 'task')).resolves.toMatchObject({ code: 7 })
    expect(vi.getTimerCount()).toBe(0)
  })
})
