import type { Process } from '@/sys0/proc'
import { errorMessage } from '@/utils/errors'
import { createGameSyscallHandlers } from '../game'
import { createSyscallChannel, SyscallServer } from '../ipc'
import { isWorkerStatusMessage, WorkerInitMessage } from './protocol'

export interface WorkerLike {
  postMessage(message: WorkerInitMessage): void
  terminate(): void
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void
  removeEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void
  removeEventListener(type: 'error', listener: (event: ErrorEvent) => void): void
}

export interface WorkerProgramDefinition {
  createWorker(): WorkerLike
}

export const runWorkerProgram = (
  process: Process,
  definition: WorkerProgramDefinition,
  name: string,
  args: string[],
): Promise<number> => {
  const channel = createSyscallChannel().unwrapBy((error) => {
    throw new Error(error.message)
  })
  const worker = definition.createWorker()
  const abortController = new AbortController()
  const server = new SyscallServer(
    channel,
    createGameSyscallHandlers(process, abortController.signal),
    error => process.error(error.message),
  )
  const serverSubscription = server.attach(worker)

  return new Promise<number>((resolve) => {
    let hasFinished = false
    const finish = (exitCode: number) => {
      if (hasFinished) return
      hasFinished = true
      abortController.abort()
      interruptSubscription.dispose()
      serverSubscription.dispose()
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      server.close()
      worker.terminate()
      resolve(exitCode)
    }
    const onMessage = (event: MessageEvent<unknown>) => {
      if (! isWorkerStatusMessage(event.data)) return
      if (event.data.type === 'sudoer:worker-exit') finish(event.data.exitCode)
      else {
        process.error(event.data.stack ?? event.data.message)
        finish(128)
      }
    }
    const onError = (event: ErrorEvent) => {
      process.error(errorMessage(event.error ?? event.message))
      finish(128)
    }
    const interruptSubscription = process.on('interrupt', () => finish(130))

    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
    try {
      worker.postMessage({
        type: 'sudoer:worker-init',
        channel,
        name,
        args,
      })
    }
    catch (error) {
      process.error(error)
      finish(128)
    }
  })
}
