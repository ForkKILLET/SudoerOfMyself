import { Err, Result } from 'fk-result'
import { SyscallMemory } from './memory'
import {
  isSyscallSignal,
  SyscallChannelDescriptor,
  SyscallHandlerError,
  SyscallHandlers,
  SyscallMessageSource,
  SyscallRequest,
  SyscallResponse,
  SyscallSignal,
  SyscallTransportError,
  transportError,
} from './types'
import { IDisposable } from '@/utils/disposable'

const handlerError = (name: string, error: unknown): SyscallHandlerError => ({
  source: 'handler',
  name,
  message: error instanceof Error ? error.message : String(error),
  ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
})

export interface SyscallServerTimingOptions {
  now?: () => number
  onHandlerTime?: (milliseconds: number) => void
}

export class SyscallServer<Schema> {
  private readonly memory: SyscallMemory
  private isHandling = false

  constructor(
    descriptor: SyscallChannelDescriptor,
    private readonly handlers: SyscallHandlers<Schema>,
    private readonly onTransportError?: (error: SyscallTransportError) => void,
    private readonly timing: SyscallServerTimingOptions = {},
  ) {
    this.memory = new SyscallMemory(descriptor)
  }

  attach(source: SyscallMessageSource): IDisposable {
    const listener = (event: MessageEvent<unknown>) => {
      if (! isSyscallSignal(event.data)) return
      void this.handleSignal(event.data)
    }
    source.addEventListener('message', listener)
    return {
      dispose: () => source.removeEventListener('message', listener),
    }
  }

  async handleSignal(signal: SyscallSignal): Promise<boolean> {
    if (signal.channelId !== this.memory.descriptor.channelId) return false
    if (this.isHandling) {
      this.onTransportError?.(transportError('invalid-state', 'Received overlapping syscall signals'))
      return true
    }

    this.isHandling = true
    try {
      const request = this.memory.takeRequest<SyscallRequest>()
      if (request.isErr) {
        this.onTransportError?.(request.err)
        this.sendResponse({ ok: false, error: request.err })
        return true
      }
      const response = await this.dispatch(request.val)
      this.sendResponse(response)
      return true
    }
    finally {
      this.isHandling = false
    }
  }

  close() {
    this.memory.close()
  }

  private async dispatch(request: SyscallRequest): Promise<SyscallResponse> {
    if (
      ! request
      || typeof request !== 'object'
      || typeof request.name !== 'string'
      || ! Array.isArray(request.args)
    ) {
      return { ok: false, error: transportError('invalid-message', 'Received an invalid syscall request') }
    }

    const handler = Reflect.get(this.handlers as object, request.name) as unknown
    if (typeof handler !== 'function') {
      return { ok: false, error: handlerError(request.name, new Error('Unknown syscall')) }
    }

    let result: Result<unknown, unknown>
    try {
      const now = this.timing.now ?? performance.now.bind(performance)
      const startedAt = now()
      let pendingResult: unknown
      try {
        pendingResult = handler(...request.args)
      }
      finally {
        this.timing.onHandlerTime?.(Math.max(0, now() - startedAt))
      }
      result = await pendingResult as Result<unknown, unknown>
    }
    catch (error) {
      result = Err(handlerError(request.name, error))
    }
    if (
      ! result
      || typeof result !== 'object'
      || typeof result.isOk !== 'boolean'
      || typeof result.isErr !== 'boolean'
    ) {
      return {
        ok: false,
        error: handlerError(request.name, new TypeError('Syscall handler did not return a Result')),
      }
    }
    return result.isOk
      ? { ok: true, value: result.val }
      : { ok: false, error: result.err }
  }

  private sendResponse(response: SyscallResponse) {
    const sent = this.memory.respond(response)
    if (sent.isOk) return

    const fallback = this.memory.respond({ ok: false, error: sent.err } satisfies SyscallResponse)
    if (fallback.isErr) {
      this.onTransportError?.(fallback.err)
      this.memory.close()
    }
  }
}
