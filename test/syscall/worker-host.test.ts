import { describe, expect, it } from 'vitest'
import { Context } from '@/sys0/context'
import { FRead, FWrite } from '@/sys0/fs'
import { Process } from '@/sys0/proc'
import { Stdio } from '@/sys0/stdio'
import { createWorkerProgram, WorkerLike, WorkerProgramDefinition } from '@/syscall/worker/host'
import { WorkerInitMessage, WorkerStatusMessage } from '@/syscall/worker/protocol'
import { normalExit, PROCESS_SIGNALS, signalExit } from '@/sys0/process_exit'
import { ProcessTable } from '@/sys0/process_table'
import { ProcessGroup } from '@/sys0/job'
import { TimeService } from '@/sys0/time'

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

class FakeWorker implements WorkerLike {
  terminated = false
  initMessage?: WorkerInitMessage
  onInit?: (message: WorkerInitMessage) => void
  private readonly messageListeners = new Set<(event: MessageEvent<unknown>) => void>()
  private readonly errorListeners = new Set<(event: ErrorEvent) => void>()

  postMessage(message: WorkerInitMessage) {
    this.initMessage = message
    this.onInit?.(message)
  }

  terminate() {
    this.terminated = true
  }

  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void
  addEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<unknown>) => void) | ((event: ErrorEvent) => void),
  ) {
    if (type === 'message') {
      this.messageListeners.add(listener as (event: MessageEvent<unknown>) => void)
    }
    else {
      this.errorListeners.add(listener as (event: ErrorEvent) => void)
    }
  }

  removeEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void
  removeEventListener(type: 'error', listener: (event: ErrorEvent) => void): void
  removeEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<unknown>) => void) | ((event: ErrorEvent) => void),
  ) {
    if (type === 'message') {
      this.messageListeners.delete(listener as (event: MessageEvent<unknown>) => void)
    }
    else {
      this.errorListeners.delete(listener as (event: ErrorEvent) => void)
    }
  }

  emitMessage(message: WorkerStatusMessage) {
    const event = { data: message } as MessageEvent<unknown>
    this.messageListeners.forEach(listener => listener(event))
  }
}

const createRootProcess = () => {
  const output = new MemoryOutput()
  const context = {
    processes: new ProcessTable(),
    time: new TimeService({ monotonic: { nowMs: () => 0 } }),
  } as Context
  const root = new Process(context, null, {
    name: 'init',
    env: { HOME: '/', PATH: '/bin', PWD: '/' },
    stdio: new Stdio(new EmptyInput(), output),
  })
  return { root, output }
}

const definitionFor = (worker: FakeWorker): WorkerProgramDefinition => ({
  createWorker: () => worker,
})

describe('Worker process host', () => {
  it('propagates a normal Worker exit into the process lifecycle', async () => {
    const { root } = createRootProcess()
    const worker = new FakeWorker()
    worker.onInit = () => queueMicrotask(() => worker.emitMessage({
      type: 'sudoer:worker-exit',
      exitCode: 5,
      usage: { userMs: 12, syscallMs: 5 },
    }))
    const processGroup = new ProcessGroup()

    const running = root.spawn(createWorkerProgram(definitionFor(worker)), {
      name: 'worker-program',
      processGroup,
    })
    const child = root.subProcesses[0]

    expect(root.ctx.processes.size).toBe(2)
    expect(root.subProcesses).toEqual([child])
    expect(child.subProcesses).toEqual([])
    expect(processGroup.pgid).toBe(child.pid)
    expect(processGroup.size).toBe(1)

    await expect(running).resolves.toEqual(normalExit(5))
    expect(child.state).toBe('exited')
    expect(child.exitCode).toBe(5)
    expect(root.subProcesses).toEqual([])
    expect(root.ctx.processes.size).toBe(1)
    expect(processGroup.size).toBe(0)
    expect(processGroup.usage).toEqual({ userMs: 12, systemMs: 0, blockedMs: 5 })
    expect(root.accounting.childUsage).toEqual({ userMs: 12, systemMs: 0, blockedMs: 5 })
    expect(worker.terminated).toBe(true)
  })

  it.each(PROCESS_SIGNALS)('force-terminates a CPU-bound Worker on %s', async (signal) => {
    const { root } = createRootProcess()
    const worker = new FakeWorker()
    const running = root.spawn(createWorkerProgram(definitionFor(worker)), { name: 'cpu-bound' })
    const child = root.subProcesses[0]

    expect(root.ctx.processes.size).toBe(2)

    child.sendSignal(signal)

    await expect(running).resolves.toEqual(signalExit(signal))
    expect(worker.terminated).toBe(true)
    expect(root.subProcesses).toEqual([])
    expect(root.ctx.processes.size).toBe(1)
  })
})
