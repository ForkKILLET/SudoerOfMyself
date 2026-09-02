import { Err, Ok, Result } from 'fk-result'
import { SyscallMemory } from './memory'
import {
  SyscallArgs,
  SyscallChannelDescriptor,
  SyscallError,
  SyscallMessageSink,
  SyscallRequest,
  SyscallResponse,
  SyscallReturn,
  transportError,
} from './types'

export interface SyncSyscallClientTimingOptions {
  now?: () => number
  onCallTime?: (milliseconds: number) => void
}

export class SyncSyscallClient<Schema> {
  private readonly memory: SyscallMemory

  constructor(
    descriptor: SyscallChannelDescriptor,
    private readonly sink: SyscallMessageSink,
    private readonly timing: SyncSyscallClientTimingOptions = {},
  ) {
    this.memory = new SyscallMemory(descriptor)
  }

  call<Name extends keyof Schema & string>(
    name: Name,
    ...args: SyscallArgs<Schema, Name>
  ): Result<SyscallReturn<Schema, Name>, SyscallError<Schema, Name>> {
    const now = this.timing.now ?? performance.now.bind(performance)
    const startedAt = now()
    try {
      return this.callUnchecked(name, args)
    }
    finally {
      this.timing.onCallTime?.(Math.max(0, now() - startedAt))
    }
  }

  private callUnchecked<Name extends keyof Schema & string>(
    name: Name,
    args: SyscallArgs<Schema, Name>,
  ): Result<SyscallReturn<Schema, Name>, SyscallError<Schema, Name>> {
    const request: SyscallRequest = { name, args: [...args] }
    const begun = this.memory.beginRequest(request)
    if (begun.isErr) return begun

    const signalled = Result.wrap<void, unknown>(() => this.sink.postMessage({
      type: 'sudoer:syscall',
      channelId: this.memory.descriptor.channelId,
    }))
    if (signalled.isErr) {
      this.memory.cancelRequest()
      return Err(transportError('signal-failed', `Could not signal syscall server: ${String(signalled.err)}`))
    }

    const response = this.memory.waitForResponse<SyscallResponse>()
    if (response.isErr) {
      if (this.memory.releaseResponse().isErr) this.memory.cancelRequest()
      return response
    }
    const released = this.memory.releaseResponse()
    if (released.isErr) return released

    if (! response.val || typeof response.val !== 'object' || typeof response.val.ok !== 'boolean') {
      return Err(transportError('invalid-message', 'Syscall server returned an invalid response envelope'))
    }
    return response.val.ok
      ? Ok(response.val.value as SyscallReturn<Schema, Name>)
      : Err(response.val.error as SyscallError<Schema, Name>)
  }
}
