import { describe, expect, it, vi } from 'vitest'
import { Emitter, Events } from '@/utils/emitter'

interface TestEvents extends Events {
  value: [number]
}

describe('Emitter', () => {
  it('supports one-shot listeners', () => {
    const emitter = new Emitter<TestEvents>()
    const listener = vi.fn()

    emitter.on('value', listener, { once: true })
    emitter.emit('value', 1)
    emitter.emit('value', 2)

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith(1)
  })

  it('uses a stable listener snapshot while emitting', () => {
    const emitter = new Emitter<TestEvents>()
    const calls: string[] = []
    const second = () => calls.push('second')
    let disposeSecond = () => {}

    emitter.on('value', () => {
      calls.push('first')
      disposeSecond()
    })
    disposeSecond = emitter.on('value', second).dispose

    emitter.emit('value', 0)
    emitter.emit('value', 0)

    expect(calls).toEqual(['first', 'second', 'first'])
  })
})
