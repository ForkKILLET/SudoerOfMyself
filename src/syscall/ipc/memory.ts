import { Err, Ok, Result } from 'fk-result'
import {
  SyscallChannelDescriptor,
  SyscallTransportError,
  transportError,
} from './types'

const enum ChannelState {
  IDLE,
  REQUEST_READY,
  RESPONSE_READY,
  CLOSED,
}

const STATE_INDEX = 0
const REQUEST_LENGTH_INDEX = 1
const RESPONSE_LENGTH_INDEX = 2
const HEADER_WORDS = 3
const HEADER_BYTES = HEADER_WORDS * Int32Array.BYTES_PER_ELEMENT
const MIN_CAPACITY = 256
const DEFAULT_CAPACITY = 64 * 1024

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })

const serialize = (value: unknown): Result<Uint8Array, SyscallTransportError> => {
  const serialized = Result.wrap<string | undefined, unknown>(() => JSON.stringify(value))
  if (serialized.isErr) {
    return Err(transportError('serialization-failed', `Could not serialize syscall payload: ${String(serialized.err)}`))
  }
  if (serialized.val === undefined) {
    return Err(transportError('serialization-failed', 'Syscall payload is not JSON-serializable'))
  }
  return Ok(encoder.encode(serialized.val))
}

const deserialize = <T>(bytes: Uint8Array): Result<T, SyscallTransportError> => {
  const parsed = Result.wrap<T, unknown>(() => JSON.parse(decoder.decode(bytes)) as T)
  return parsed.mapErr(error => transportError(
    'serialization-failed',
    `Could not deserialize syscall payload: ${String(error)}`,
  ))
}

export const createSyscallChannel = (
  capacity = DEFAULT_CAPACITY,
  channelId: string = crypto.randomUUID(),
): Result<SyscallChannelDescriptor, SyscallTransportError> => {
  if (! Number.isSafeInteger(capacity) || capacity < MIN_CAPACITY) {
    return Err(transportError(
      'invalid-channel',
      `Syscall channel capacity must be an integer of at least ${MIN_CAPACITY} bytes`,
    ))
  }

  const bufferResult = Result.wrap<SharedArrayBuffer, unknown>(
    () => new SharedArrayBuffer(HEADER_BYTES + capacity),
  )
  return bufferResult
    .map(buffer => ({ channelId, buffer }))
    .mapErr(error => transportError(
      'invalid-channel',
      `Could not create SharedArrayBuffer: ${String(error)}`,
    ))
}

export class SyscallMemory {
  readonly capacity: number
  private readonly header: Int32Array
  private readonly payload: Uint8Array

  constructor(readonly descriptor: SyscallChannelDescriptor) {
    const { buffer } = descriptor
    if (! (buffer instanceof SharedArrayBuffer) || buffer.byteLength < HEADER_BYTES + MIN_CAPACITY) {
      throw new RangeError('Invalid syscall SharedArrayBuffer')
    }
    this.header = new Int32Array(buffer, 0, HEADER_WORDS)
    this.payload = new Uint8Array(buffer, HEADER_BYTES)
    this.capacity = this.payload.byteLength
  }

  beginRequest(request: unknown): Result<void, SyscallTransportError> {
    const state = Atomics.load(this.header, STATE_INDEX)
    if (state === ChannelState.CLOSED) {
      return Err(transportError('channel-closed', 'Syscall channel is closed'))
    }
    if (state !== ChannelState.IDLE) {
      return Err(transportError('invalid-state', 'Syscall channel already has an in-flight request'))
    }

    const bytesResult = this.encodePayload(request)
    if (bytesResult.isErr) return bytesResult
    this.payload.set(bytesResult.val)
    Atomics.store(this.header, REQUEST_LENGTH_INDEX, bytesResult.val.byteLength)
    Atomics.store(this.header, RESPONSE_LENGTH_INDEX, 0)
    Atomics.store(this.header, STATE_INDEX, ChannelState.REQUEST_READY)
    return Ok(undefined)
  }

  takeRequest<T>(): Result<T, SyscallTransportError> {
    const state = Atomics.load(this.header, STATE_INDEX)
    if (state !== ChannelState.REQUEST_READY) {
      return Err(transportError('invalid-state', 'Syscall channel has no request ready'))
    }
    return this.decodePayload<T>(Atomics.load(this.header, REQUEST_LENGTH_INDEX))
  }

  respond(response: unknown): Result<void, SyscallTransportError> {
    const state = Atomics.load(this.header, STATE_INDEX)
    if (state !== ChannelState.REQUEST_READY) {
      return Err(transportError('invalid-state', 'Cannot respond without an active syscall request'))
    }

    const bytesResult = this.encodePayload(response)
    if (bytesResult.isErr) return bytesResult
    this.payload.set(bytesResult.val)
    Atomics.store(this.header, RESPONSE_LENGTH_INDEX, bytesResult.val.byteLength)
    Atomics.store(this.header, STATE_INDEX, ChannelState.RESPONSE_READY)
    Atomics.notify(this.header, STATE_INDEX)
    return Ok(undefined)
  }

  waitForResponse<T>(): Result<T, SyscallTransportError> {
    while (true) {
      const state = Atomics.load(this.header, STATE_INDEX)
      if (state === ChannelState.RESPONSE_READY) {
        return this.decodePayload<T>(Atomics.load(this.header, RESPONSE_LENGTH_INDEX))
      }
      if (state === ChannelState.CLOSED) {
        return Err(transportError('channel-closed', 'Syscall channel was closed while waiting'))
      }
      if (state !== ChannelState.REQUEST_READY) {
        return Err(transportError('invalid-state', `Unexpected syscall channel state: ${state}`))
      }

      const waitResult = Result.wrap<string, unknown>(
        () => Atomics.wait(this.header, STATE_INDEX, ChannelState.REQUEST_READY),
      )
      if (waitResult.isErr) {
        return Err(transportError(
          'blocking-not-supported',
          `This context cannot synchronously wait for syscalls: ${String(waitResult.err)}`,
        ))
      }
    }
  }

  releaseResponse() {
    const previous = Atomics.compareExchange(
      this.header,
      STATE_INDEX,
      ChannelState.RESPONSE_READY,
      ChannelState.IDLE,
    )
    return previous === ChannelState.RESPONSE_READY
      ? Ok(undefined)
      : Err(transportError('invalid-state', 'Syscall channel has no response to release'))
  }

  cancelRequest() {
    const previous = Atomics.compareExchange(
      this.header,
      STATE_INDEX,
      ChannelState.REQUEST_READY,
      ChannelState.IDLE,
    )
    return previous === ChannelState.REQUEST_READY
  }

  close() {
    Atomics.store(this.header, STATE_INDEX, ChannelState.CLOSED)
    Atomics.notify(this.header, STATE_INDEX)
  }

  private encodePayload(value: unknown): Result<Uint8Array, SyscallTransportError> {
    const bytesResult = serialize(value)
    if (bytesResult.isErr) return bytesResult
    if (bytesResult.val.byteLength > this.capacity) {
      return Err(transportError(
        'payload-too-large',
        `Syscall payload requires ${bytesResult.val.byteLength} bytes; channel capacity is ${this.capacity}`,
      ))
    }
    return bytesResult
  }

  private decodePayload<T>(length: number): Result<T, SyscallTransportError> {
    if (length < 0 || length > this.capacity) {
      return Err(transportError('invalid-message', `Invalid syscall payload length: ${length}`))
    }
    return deserialize<T>(this.payload.slice(0, length))
  }
}
