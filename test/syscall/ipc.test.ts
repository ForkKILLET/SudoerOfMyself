import { describe, expect, it } from 'vitest'
import { Err, Ok } from 'fk-result'
import {
  createSyscallChannel,
  SyncSyscallClient,
  SyscallDefinition,
  SyscallMemory,
  SyscallRequest,
  SyscallResponse,
  SyscallServer,
  SyscallSignal,
} from '@/syscall/ipc'

type TestSchema = {
  add: SyscallDefinition<[left: number, right: number], number, { code: 'denied' }>
  fail: SyscallDefinition<[], never, { code: 'denied' }>
  crash: SyscallDefinition<[], never, never>
  large: SyscallDefinition<[], string, never>
}

const createDescriptor = (capacity = 4096) => createSyscallChannel(capacity, 'test-channel').unwrap()

describe('SyncSyscallClient', () => {
  it('does not lose a response delivered before Atomics.wait begins', () => {
    const descriptor = createDescriptor()
    const serverMemory = new SyscallMemory(descriptor)
    const client = new SyncSyscallClient<TestSchema>(descriptor, {
      postMessage(signal) {
        expect(signal.channelId).toBe('test-channel')
        const request = serverMemory.takeRequest<SyscallRequest>().unwrap()
        expect(request).toEqual({ name: 'add', args: [20, 22] })
        serverMemory.respond({ ok: true, value: 42 } satisfies SyscallResponse).unwrap()
      },
    })

    const result = client.call('add', 20, 22)

    expect(result.isOk && result.val).toBe(42)
  })

  it('releases the request slot when signalling fails', () => {
    const descriptor = createDescriptor()
    const serverMemory = new SyscallMemory(descriptor)
    let shouldFail = true
    const client = new SyncSyscallClient<TestSchema>(descriptor, {
      postMessage() {
        if (shouldFail) throw new Error('detached worker')
        serverMemory.takeRequest<SyscallRequest>().unwrap()
        serverMemory.respond({ ok: true, value: 2 } satisfies SyscallResponse).unwrap()
      },
    })

    const failed = client.call('add', 1, 1)
    shouldFail = false
    const recovered = client.call('add', 1, 1)

    expect(failed.isErr && failed.err).toMatchObject({ source: 'transport', code: 'signal-failed' })
    expect(recovered.isOk && recovered.val).toBe(2)
  })

  it('rejects oversized requests without occupying the channel', () => {
    const descriptor = createDescriptor(256)
    const memory = new SyscallMemory(descriptor)

    const oversized = memory.beginRequest({ data: 'x'.repeat(1024) })
    const valid = memory.beginRequest({ name: 'small', args: [] })

    expect(oversized.isErr && oversized.err.code).toBe('payload-too-large')
    expect(valid.isOk).toBe(true)
  })
})

describe('SyscallServer', () => {
  const handlers = {
    add: (left: number, right: number) => Ok(left + right),
    fail: () => Err({ code: 'denied' } as const),
    crash: () => {
      throw new Error('kernel exploded')
    },
    large: () => Ok('x'.repeat(1024)),
  }

  const request = async (name: string, args: unknown[] = [], capacity = 4096) => {
    const descriptor = createDescriptor(capacity)
    const memory = new SyscallMemory(descriptor)
    const server = new SyscallServer<TestSchema>(descriptor, handlers)
    memory.beginRequest({ name, args }).unwrap()

    const handled = await server.handleSignal({
      type: 'sudoer:syscall',
      channelId: descriptor.channelId,
    })
    const response = memory.waitForResponse<SyscallResponse>().unwrap()
    memory.releaseResponse().unwrap()
    return { handled, response }
  }

  it('dispatches async-capable handlers and preserves domain errors', async () => {
    await expect(request('add', [2, 3])).resolves.toEqual({
      handled: true,
      response: { ok: true, value: 5 },
    })
    await expect(request('fail')).resolves.toEqual({
      handled: true,
      response: { ok: false, error: { code: 'denied' } },
    })
  })

  it('serializes unexpected handler exceptions', async () => {
    const { response } = await request('crash')

    expect(response).toMatchObject({
      ok: false,
      error: {
        source: 'handler',
        name: 'crash',
        message: 'kernel exploded',
      },
    })
  })

  it('returns a compact transport error when a response exceeds capacity', async () => {
    const { response } = await request('large', [], 256)

    expect(response).toMatchObject({
      ok: false,
      error: { source: 'transport', code: 'payload-too-large' },
    })
  })

  it('ignores notifications for other channels', async () => {
    const descriptor = createDescriptor()
    const server = new SyscallServer<TestSchema>(descriptor, handlers)
    const signal: SyscallSignal = { type: 'sudoer:syscall', channelId: 'another-channel' }

    await expect(server.handleSignal(signal)).resolves.toBe(false)
  })

  it('responds to malformed requests instead of leaving the caller blocked', async () => {
    const descriptor = createDescriptor()
    const memory = new SyscallMemory(descriptor)
    const server = new SyscallServer<TestSchema>(descriptor, handlers)
    memory.beginRequest({ nope: true }).unwrap()

    await server.handleSignal({ type: 'sudoer:syscall', channelId: descriptor.channelId })
    const response = memory.waitForResponse<SyscallResponse>().unwrap()

    expect(response).toMatchObject({
      ok: false,
      error: { source: 'transport', code: 'invalid-message' },
    })
  })
})
