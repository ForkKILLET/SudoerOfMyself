import { describe, expect, it } from 'vitest'
import { ProcessAccounting } from '@/sys0/process_usage'

describe('ProcessAccounting', () => {
  it('tracks self, child, and total usage independently', () => {
    const accounting = new ProcessAccounting()
    accounting.addUser(10)
    accounting.addSystem(2)
    accounting.addBlocked(5)
    accounting.addChild({ userMs: 20, systemMs: 4, blockedMs: 8 })

    expect(accounting.selfUsage).toEqual({ userMs: 10, systemMs: 2, blockedMs: 5 })
    expect(accounting.childUsage).toEqual({ userMs: 20, systemMs: 4, blockedMs: 8 })
    expect(accounting.totalUsage).toEqual({ userMs: 30, systemMs: 6, blockedMs: 13 })
  })

  it('ignores negative and non-finite durations', () => {
    const accounting = new ProcessAccounting()
    accounting.addUser(- 1)
    accounting.addSystem(Number.NaN)
    accounting.addBlocked(Number.POSITIVE_INFINITY)

    expect(accounting.selfUsage).toEqual({ userMs: 0, systemMs: 0, blockedMs: 0 })
  })
})
