import { SyncSyscallClient } from '../ipc'
import { GameSyscallSchema, WorkerProcessApi } from '../game'
import { isWorkerInitMessage, WorkerFailureMessage, WorkerStatusMessage } from './protocol'

export type WorkerProgram = (
  process: WorkerProcessApi,
  name: string,
  ...args: string[]
) => number

export interface WorkerRuntimeScope {
  postMessage(message: WorkerStatusMessage | { type: 'sudoer:syscall', channelId: string }): void
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void
}

export const startWorkerProgram = (
  scope: WorkerRuntimeScope,
  program: WorkerProgram,
) => {
  let hasStarted = false
  scope.addEventListener('message', (event) => {
    if (! isWorkerInitMessage(event.data) || hasStarted) return
    hasStarted = true

    const { channel, name, args } = event.data
    const client = new SyncSyscallClient<GameSyscallSchema>(channel, scope)
    const process = new WorkerProcessApi(client, totalMs => scope.postMessage({
      type: 'sudoer:worker-cpu-time',
      totalMs,
    }))
    try {
      const exitCode = program(process, name, ...args)
      scope.postMessage({ type: 'sudoer:worker-exit', exitCode })
    }
    catch (error) {
      const failure: WorkerFailureMessage = {
        type: 'sudoer:worker-failure',
        message: error instanceof Error ? error.message : String(error),
        ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
      }
      scope.postMessage(failure)
    }
  })
}
