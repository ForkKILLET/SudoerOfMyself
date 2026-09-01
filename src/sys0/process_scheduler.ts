import type { Awaitable } from '@/utils/types'

interface ScheduledRun<T> {
  run: () => Awaitable<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason: unknown) => void
}

type AnyScheduledRun = ScheduledRun<unknown>

export class ProcessScheduler {
  private readonly readyQueue: AnyScheduledRun[] = []
  private tickPending = false

  schedule<T>(run: () => Awaitable<T>): Promise<T> {
    const completion = new Promise<T>((resolve, reject) => {
      this.readyQueue.push({ run, resolve, reject } as AnyScheduledRun)
    })
    this.requestTick()
    return completion
  }

  private requestTick() {
    if (this.tickPending) return
    this.tickPending = true
    queueMicrotask(() => this.tick())
  }

  private tick() {
    this.tickPending = false
    const ready = this.readyQueue.splice(0)
    ready.forEach(({ run, resolve, reject }) => {
      try {
        Promise.resolve(run()).then(resolve, reject)
      }
      catch (error) {
        reject(error)
      }
    })
    if (this.readyQueue.length) this.requestTick()
  }
}

export const defaultProcessScheduler = new ProcessScheduler()
