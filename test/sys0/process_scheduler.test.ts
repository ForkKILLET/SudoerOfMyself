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

  it('yields to the host task queue after exhausting a time slice', async () => {
    let now = 0
    const tasks: (() => void)[] = []
    const starts: string[] = []
    const scheduler = new ProcessScheduler({
      sliceDurationMs: 5,
      now: () => now,
      scheduleTask: task => tasks.push(task),
    })

    await scheduler.schedule(() => {
      starts.push('first')
      now = 5
    })
    const second = scheduler.schedule(() => starts.push('second'))

    await Promise.resolve()
    expect(starts).toEqual(['first'])
    expect(tasks).toHaveLength(1)

    tasks.shift()?.()
    await second
    expect(starts).toEqual(['first', 'second'])
  })

  it('bounds the number of process starts in one host task', async () => {
    const tasks: (() => void)[] = []
    const starts: number[] = []
    const scheduler = new ProcessScheduler({
      startsPerSlice: 2,
      scheduleTask: task => tasks.push(task),
    })

    const runs = [1, 2, 3].map(value => scheduler.schedule(() => starts.push(value)))
    await Promise.resolve()
    expect(starts).toEqual([1, 2])
    expect(tasks).toHaveLength(1)

    tasks.shift()?.()
    await Promise.all(runs)
    expect(starts).toEqual([1, 2, 3])
  })

  it('rejects completion when a program throws during startup', async () => {
    const scheduler = new ProcessScheduler()

    await expect(scheduler.schedule(() => {
      throw new Error('startup failed')
    })).rejects.toThrow('startup failed')
  })
})
