import { describe, expect, it } from 'vitest'
import {
  type AsyncGameClockStore,
  GameClockRevisionConflictError,
  QueuedGameClockPersistence,
} from '@/sys0/time_persistence'
import type { GameClockState } from '@/sys0/time'

const initialState: GameClockState = {
  worldTimeMs: 1_000,
  rate: 1,
  running: true,
  timezone: 'UTC',
}

class MemoryAsyncGameClockStore implements AsyncGameClockStore {
  image: unknown
  revision = 0

  async loadGameClock() {
    return this.image
  }

  async commitGameClock(state: GameClockState, expectedRevision: number) {
    if (expectedRevision !== this.revision) {
      throw new GameClockRevisionConflictError(expectedRevision, this.revision)
    }
    this.revision ++
    this.image = {
      format: 'sudoer-of-myself/game-clock',
      version: 1,
      revision: this.revision,
      ...structuredClone(state),
    }
    return this.revision
  }
}

describe('QueuedGameClockPersistence', () => {
  it('hydrates and serializes clock state', async () => {
    const store = new MemoryAsyncGameClockStore()
    const first = await QueuedGameClockPersistence.create(store)
    expect(first.load()).toBeUndefined()

    first.commit(initialState)
    await first.flush()
    const second = await QueuedGameClockPersistence.create(store)

    expect(second.load()).toEqual(initialState)
  })

  it('coalesces pending clock states while preserving the latest value', async () => {
    const store = new MemoryAsyncGameClockStore()
    const persistence = await QueuedGameClockPersistence.create(store)

    persistence.commit(initialState)
    persistence.commit({ ...initialState, worldTimeMs: 2_000 })
    await persistence.flush()

    expect(persistence.load()?.worldTimeMs).toBe(2_000)
    expect((store.image as { worldTimeMs: number }).worldTimeMs).toBe(2_000)
  })
})
