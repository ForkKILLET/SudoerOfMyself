import { describe, expect, it } from 'vitest'
import { ProcessScheduler } from '@/sys0/process_scheduler'

describe('ProcessScheduler', () => {
  it('starts queued programs in FIFO order on the next microtask', async () => {
    const scheduler = new ProcessScheduler()
    const starts: string[] = []

    const first = scheduler.schedule(() => starts.push('first'))
    const second = scheduler.schedule(() => starts.push('second'))

    expect(starts).toEqual([])
    await Promise.all([first, second])
    expect(starts).toEqual(['first', 'second'])
  })

  it('keeps later programs runnable while an earlier one is waiting', async () => {
    const scheduler = new ProcessScheduler()
    let finishFirst = () => {}
    const first = scheduler.schedule(() => new Promise<void>((resolve) => {
      finishFirst = resolve
    }))
    const second = scheduler.schedule(() => 'finished')

    await expect(second).resolves.toBe('finished')
    finishFirst()
    await expect(first).resolves.toBeUndefined()
  })

  it('rejects completion when a program throws during startup', async () => {
    const scheduler = new ProcessScheduler()

    await expect(scheduler.schedule(() => {
      throw new Error('startup failed')
    })).rejects.toThrow('startup failed')
  })
})
