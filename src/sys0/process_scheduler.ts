import type { Awaitable } from '@/utils/types'

interface ScheduledRun<T> {
  run: () => Awaitable<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason: unknown) => void
}

type AnyScheduledRun = ScheduledRun<unknown>

const DEFAULT_SLICE_DURATION_MS = 8
const DEFAULT_STARTS_PER_SLICE = 256

export interface ProcessSchedulerOptions {
  sliceDurationMs?: number
  startsPerSlice?: number
  now?: () => number
  scheduleTask?: (run: () => void) => void
}

export class ProcessScheduler {
  private readonly readyQueue: AnyScheduledRun[] = []
  private tickPending = false
  private sliceStartedAt: number | undefined
  private lastRunFinishedAt: number | undefined
  private startsInSlice = 0

  private readonly sliceDurationMs: number
  private readonly startsPerSlice: number
  private readonly now: () => number
  private readonly scheduleTask: (run: () => void) => void

  constructor({
    sliceDurationMs = DEFAULT_SLICE_DURATION_MS,
    startsPerSlice = DEFAULT_STARTS_PER_SLICE,
    now = () => performance.now(),
    scheduleTask = (run) => {
      setTimeout(run, 0)
    },
  }: ProcessSchedulerOptions = {}) {
    if (sliceDurationMs <= 0) throw new RangeError('Process scheduler slice duration must be positive')
    if (! Number.isInteger(startsPerSlice) || startsPerSlice <= 0) {
      throw new RangeError('Process scheduler starts per slice must be a positive integer')
    }
    this.sliceDurationMs = sliceDurationMs
    this.startsPerSlice = startsPerSlice
    this.now = now
    this.scheduleTask = scheduleTask
  }

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

    const now = this.now()
    if (
      this.sliceStartedAt === undefined
      || (
        this.lastRunFinishedAt !== undefined
        && now - this.lastRunFinishedAt >= this.sliceDurationMs
      )
    ) this.resetSlice(now)
    const sliceElapsed = this.sliceStartedAt === undefined ? 0 : now - this.sliceStartedAt

    if (
      this.startsInSlice >= this.startsPerSlice
      || sliceElapsed >= this.sliceDurationMs
    ) {
      this.scheduleTask(() => {
        this.resetSlice(this.now())
        this.tick()
      })
    }
    else queueMicrotask(() => this.tick())
  }

  private tick() {
    this.tickPending = false
    const availableStarts = Math.max(1, this.startsPerSlice - this.startsInSlice)
    const ready = this.readyQueue.splice(0, availableStarts)
    this.startsInSlice += ready.length
    ready.forEach(({ run, resolve, reject }) => {
      try {
        Promise.resolve(run()).then(resolve, reject)
      }
      catch (error) {
        reject(error)
      }
    })
    this.lastRunFinishedAt = this.now()
    if (this.readyQueue.length) this.requestTick()
  }

  private resetSlice(now: number) {
    this.sliceStartedAt = now
    this.lastRunFinishedAt = undefined
    this.startsInSlice = 0
  }
}

export const defaultProcessScheduler = new ProcessScheduler()
