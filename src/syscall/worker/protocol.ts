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
  usage?: WorkerUsage
}

export interface WorkerUsage {
  userMs: number
  syscallMs: number
}

export interface WorkerFailureMessage {
  type: 'sudoer:worker-failure'
  message: string
  stack?: string
}

export type WorkerStatusMessage = WorkerExitMessage | WorkerFailureMessage

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
  if (message.type === 'sudoer:worker-failure') return true
  if (message.type !== 'sudoer:worker-exit') return false
  if (! message.usage) return true
  return Number.isFinite(message.usage.userMs) && Number.isFinite(message.usage.syscallMs)
}
