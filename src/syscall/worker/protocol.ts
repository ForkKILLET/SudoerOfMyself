import { SyscallChannelDescriptor } from '../ipc'

export interface WorkerInitMessage {
  type: 'sudoer:worker-init'
  channel: SyscallChannelDescriptor
  name: string
  args: string[]
}

export interface WorkerExitMessage {
  type: 'sudoer:worker-exit'
  exitCode: number
}

export interface WorkerFailureMessage {
  type: 'sudoer:worker-failure'
  message: string
  stack?: string
}

export interface WorkerCpuTimeMessage {
  type: 'sudoer:worker-cpu-time'
  totalMs: number
}

export type WorkerStatusMessage = WorkerExitMessage | WorkerFailureMessage | WorkerCpuTimeMessage

export const isWorkerInitMessage = (value: unknown): value is WorkerInitMessage => {
  if (! value || typeof value !== 'object') return false
  const message = value as Partial<WorkerInitMessage>
  return message.type === 'sudoer:worker-init'
    && !! message.channel
    && typeof message.name === 'string'
    && Array.isArray(message.args)
}

export const isWorkerStatusMessage = (value: unknown): value is WorkerStatusMessage => {
  if (! value || typeof value !== 'object') return false
  const message = value as Partial<WorkerStatusMessage>
  return message.type === 'sudoer:worker-exit'
    || message.type === 'sudoer:worker-failure'
    || (message.type === 'sudoer:worker-cpu-time'
      && typeof message.totalMs === 'number'
      && Number.isFinite(message.totalMs)
      && message.totalMs >= 0)
}
