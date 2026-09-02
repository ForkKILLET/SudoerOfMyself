import {
  assertGameClockState,
  type GameClockState,
} from './time'

export const GAME_CLOCK_IMAGE_FORMAT = 'sudoer-of-myself/game-clock' as const
export const GAME_CLOCK_IMAGE_VERSION = 1 as const

export interface GameClockImage extends GameClockState {
  format: typeof GAME_CLOCK_IMAGE_FORMAT
  version: typeof GAME_CLOCK_IMAGE_VERSION
  revision: number
}

export interface GameClockPersistence {
  load(): GameClockState | undefined
  commit(state: GameClockState): void
  flush(): Promise<void>
}

export interface AsyncGameClockStore {
  loadGameClock(): Promise<unknown | undefined>
  commitGameClock(state: GameClockState, expectedRevision: number): Promise<number>
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
)

export const assertGameClockImage: (value: unknown) => asserts value is GameClockImage = (value) => {
  if (! isRecord(value)) throw new TypeError('Invalid game-clock image')
  if (value.format !== GAME_CLOCK_IMAGE_FORMAT) throw new TypeError('Invalid game-clock image format')
  if (value.version !== GAME_CLOCK_IMAGE_VERSION) throw new TypeError('Unsupported game-clock image version')
  if (! Number.isSafeInteger(value.revision) || (value.revision as number) < 0) {
    throw new TypeError('Invalid game-clock revision')
  }
  assertGameClockState(value)
}

export class GameClockRevisionConflictError extends Error {
  constructor(
    readonly expectedRevision: number,
    readonly actualRevision: number,
  ) {
    super(`Game-clock revision conflict: expected ${expectedRevision}, got ${actualRevision}`)
    this.name = 'GameClockRevisionConflictError'
  }
}

export class MemoryGameClockPersistence implements GameClockPersistence {
  private state: GameClockState | undefined

  load() {
    return this.state && structuredClone(this.state)
  }

  commit(state: GameClockState) {
    this.state = structuredClone(state)
  }

  async flush() {}
}

export class QueuedGameClockPersistence implements GameClockPersistence {
  private current: GameClockState | undefined
  private pending: GameClockState | undefined
  private committedRevision: number
  private drainPromise: Promise<void> | undefined
  private writeError: unknown

  private constructor(
    private readonly store: AsyncGameClockStore,
    initialImage: GameClockImage | undefined,
  ) {
    this.current = initialImage && this.stateFromImage(initialImage)
    this.committedRevision = initialImage?.revision ?? 0
  }

  static async create(store: AsyncGameClockStore) {
    const rawImage = await store.loadGameClock()
    if (rawImage !== undefined) assertGameClockImage(rawImage)
    return new QueuedGameClockPersistence(store, rawImage)
  }

  load() {
    return this.current && structuredClone(this.current)
  }

  commit(state: GameClockState) {
    assertGameClockState(state)
    this.current = structuredClone(state)
    this.pending = structuredClone(state)
    if (! this.drainPromise) this.startDrain()
  }

  async flush() {
    while (this.drainPromise) await this.drainPromise
    if (this.writeError) throw this.writeError
  }

  private startDrain() {
    this.writeError = undefined
    this.drainPromise = Promise.resolve()
      .then(() => this.drain())
      .catch((error: unknown) => {
        this.writeError = error
      })
      .finally(() => {
        this.drainPromise = undefined
        if (this.pending && ! this.writeError) this.startDrain()
      })
  }

  private async drain() {
    while (this.pending) {
      const state = this.pending
      this.pending = undefined
      try {
        this.committedRevision = await this.store.commitGameClock(
          state,
          this.committedRevision,
        )
      }
      catch (error) {
        this.pending ??= state
        throw error
      }
    }
  }

  private stateFromImage(image: GameClockImage): GameClockState {
    const { worldTimeMs, rate, running, timezone } = image
    return { worldTimeMs, rate, running, timezone }
  }
}
