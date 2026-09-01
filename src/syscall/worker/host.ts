import type { Process } from '@/sys0/proc'
import type { Program } from '@/sys0/program'
import { errorMessage } from '@/utils/errors'
import { createGameSyscallHandlers } from '../game'
import { createSyscallChannel, SyscallServer } from '../ipc'
import { isWorkerStatusMessage, WorkerInitMessage } from './protocol'
import { normalExit, ProcessExit, signalExit } from '@/sys0/process_exit'

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
): Promise<ProcessExit> => {
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

  return new Promise<ProcessExit>((resolve) => {
    let hasFinished = false
    const finish = (exitStatus: ProcessExit) => {
      if (hasFinished) return
      hasFinished = true
      abortController.abort()
      signalSubscription.dispose()
      serverSubscription.dispose()
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      server.close()
      worker.terminate()
      resolve(exitStatus)
    }
    const onMessage = (event: MessageEvent<unknown>) => {
      if (! isWorkerStatusMessage(event.data)) return
      if (event.data.type === 'sudoer:worker-cpu-time') {
        process.reportCpuTime(event.data.totalMs)
      }
      else if (event.data.type === 'sudoer:worker-exit') finish(normalExit(event.data.exitCode))
      else {
        process.error(event.data.stack ?? event.data.message)
        finish(normalExit(128))
      }
    }
    const onError = (event: ErrorEvent) => {
      process.error(errorMessage(event.error ?? event.message))
      finish(normalExit(128))
    }
    const signalSubscription = process.on('signal', signal => finish(signalExit(signal)))

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
      finish(normalExit(128))
    }
  })
}

export const createWorkerProgram = (definition: WorkerProgramDefinition): Program =>
  (process, name, ...args) => runWorkerProgram(process, definition, name, args)
