import { Result } from 'fk-result'
import { Awaitable } from '@/utils/types'

export interface SyscallDefinition<
  Args extends readonly unknown[] = readonly unknown[],
  Return = unknown,
  Error = unknown,
> {
  args: Args
  return: Return
  error: Error
}

export type SyscallArgs<Schema, Name extends keyof Schema> =
  Schema[Name] extends SyscallDefinition<infer Args, unknown, unknown> ? Args : never

export type SyscallReturn<Schema, Name extends keyof Schema> =
  Schema[Name] extends SyscallDefinition<readonly unknown[], infer Return, unknown> ? Return : never

export type SyscallDomainError<Schema, Name extends keyof Schema> =
  Schema[Name] extends SyscallDefinition<readonly unknown[], unknown, infer Error> ? Error : never

export type SyscallTransportErrorCode =
  | 'blocking-not-supported'
  | 'channel-closed'
  | 'invalid-channel'
  | 'invalid-message'
  | 'invalid-state'
  | 'payload-too-large'
  | 'serialization-failed'
  | 'signal-failed'

export interface SyscallTransportError {
  source: 'transport'
  code: SyscallTransportErrorCode
  message: string
}

export interface SyscallHandlerError {
  source: 'handler'
  name: string
  message: string
  stack?: string
}

export type SyscallError<Schema, Name extends keyof Schema> =
  | SyscallDomainError<Schema, Name>
  | SyscallTransportError
  | SyscallHandlerError

export type SyscallHandlers<Schema> = {
  [Name in keyof Schema]: (
    ...args: SyscallArgs<Schema, Name>
  ) => Awaitable<Result<SyscallReturn<Schema, Name>, SyscallDomainError<Schema, Name>>>
}

export interface SyscallRequest {
  name: string
  args: unknown[]
}

export type SyscallResponse =
  | { ok: true, value: unknown }
  | { ok: false, error: unknown }

export interface SyscallSignal {
  type: 'sudoer:syscall'
  channelId: string
}

export interface SyscallChannelDescriptor {
  channelId: string
  buffer: SharedArrayBuffer
}

export interface SyscallMessageSink {
  postMessage(message: SyscallSignal): void
}

export interface SyscallMessageSource {
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void
  removeEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void
}

export const transportError = (
  code: SyscallTransportErrorCode,
  message: string,
): SyscallTransportError => ({ source: 'transport', code, message })

export const isSyscallSignal = (value: unknown): value is SyscallSignal => {
  if (! value || typeof value !== 'object') return false
  const signal = value as Partial<SyscallSignal>
  return signal.type === 'sudoer:syscall' && typeof signal.channelId === 'string'
}
