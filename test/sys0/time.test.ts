import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_GAME_CLOCK_STATE,
  GameClock,
  type MonotonicClock,
  TimeService,
} from '@/sys0/time'

const createMonotonicClock = (initial = 0) => {
  let now = initial
  const clock: MonotonicClock = { nowMs: () => now }
  return {
    clock,
    advance: (milliseconds: number) => { now += milliseconds },
  }
}

describe('GameClock', () => {
  it('advances from a persisted world-time anchor using monotonic time', () => {
    const monotonic = createMonotonicClock(100)
    const clock = new GameClock(monotonic.clock, {
      worldTimeMs: 1_000,
      rate: 2,
      running: true,
      timezone: 'UTC',
    })

    monotonic.advance(250)
    expect(clock.nowMs()).toBe(1_500)
    expect(clock.snapshot()).toEqual({
      worldTimeMs: 1_500,
      rate: 2,
      running: true,
      timezone: 'UTC',
    })
  })

  it('supports explicit advances, rate changes, pause, and resume', () => {
    const monotonic = createMonotonicClock()
    const clock = new GameClock(monotonic.clock, {
      worldTimeMs: 10_000,
      rate: 1,
      running: true,
      timezone: 'UTC',
    })

    monotonic.advance(100)
    clock.advanceBy(900)
    clock.setRate(2)
    monotonic.advance(100)
    expect(clock.nowMs()).toBe(11_200)

    clock.pause()
    monotonic.advance(1_000)
    expect(clock.nowMs()).toBe(11_200)

    clock.resume()
    monotonic.advance(100)
    expect(clock.nowMs()).toBe(11_400)
    clock.advanceTo(12_000)
    expect(clock.nowMs()).toBe(12_000)
  })

  it('temporarily suspends without persisting a paused clock', () => {
    const monotonic = createMonotonicClock()
    const clock = new GameClock(monotonic.clock)

    monotonic.advance(100)
    clock.suspend()
    monotonic.advance(1_000)
    expect(clock.snapshot()).toMatchObject({
      worldTimeMs: DEFAULT_GAME_CLOCK_STATE.worldTimeMs + 100,
      running: true,
    })

    clock.unsuspend()
    monotonic.advance(100)
    expect(clock.nowMs()).toBe(DEFAULT_GAME_CLOCK_STATE.worldTimeMs + 200)
  })

  it('notifies listeners only for explicit clock changes', () => {
    const monotonic = createMonotonicClock()
    const clock = new GameClock(monotonic.clock)
    const listener = vi.fn()
    const subscription = clock.onChange(listener)

    monotonic.advance(100)
    clock.setTimezone('Asia/Shanghai')
    subscription.dispose()
    clock.pause()

    expect(listener).toHaveBeenCalledOnce()
    expect(listener.mock.calls[0]?.[0]).toMatchObject({ timezone: 'Asia/Shanghai' })
  })

  it('rejects backwards or invalid clock changes', () => {
    const monotonic = createMonotonicClock()
    const clock = new GameClock(monotonic.clock)

    expect(() => clock.advanceBy(- 1)).toThrow('negative duration')
    expect(() => clock.advanceTo(clock.nowMs() - 1)).toThrow('backwards')
    expect(() => clock.setRate(Number.NaN)).toThrow('finite')
    expect(() => clock.setRate(- 1)).toThrow('negative')
    expect(() => clock.setTimezone('')).toThrow('empty')
  })
})

describe('TimeService', () => {
  it('uses the story clock epoch by default', () => {
    const monotonic = createMonotonicClock()
    const time = new TimeService({ monotonic: monotonic.clock })

    expect(time.game.nowMs()).toBe(DEFAULT_GAME_CLOCK_STATE.worldTimeMs)
  })
})
