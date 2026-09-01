import {
  applyFsDelta,
  cloneFsDelta,
  createFsDelta,
  type FileSystemImage,
  type FsDelta,
  isFsDeltaEmpty,
  mergeFsDelta,
} from './image'

export interface FsPersistence {
  load(): FileSystemImage | undefined
  commit(delta: FsDelta): void
  flush(): Promise<void>
}

export class MemoryFsPersistence implements FsPersistence {
  private image: FileSystemImage | undefined

  load() {
    return this.image && structuredClone(this.image)
  }

  commit(delta: FsDelta) {
    this.image = applyFsDelta(this.image, delta)
  }

  async flush() {}
}

export interface AsyncFileSystemStore {
  load(): Promise<FileSystemImage | undefined>
  commit(delta: FsDelta, expectedRevision: number): Promise<number>
  clear(): Promise<void>
}

export class FileSystemRevisionConflictError extends Error {
  constructor(
    readonly expectedRevision: number,
    readonly actualRevision: number,
  ) {
    super(`File-system revision conflict: expected ${expectedRevision}, got ${actualRevision}`)
    this.name = 'FileSystemRevisionConflictError'
  }
}

export class QueuedFsPersistence implements FsPersistence {
  private current: FileSystemImage | undefined
  private pending = createFsDelta()
  private committedRevision: number
  private isCommitInFlight = false
  private drainPromise: Promise<void> | undefined
  private writeError: unknown
  private hasWriteError = false

  private constructor(
    private readonly store: AsyncFileSystemStore,
    initialImage: FileSystemImage | undefined,
  ) {
    this.current = initialImage && structuredClone(initialImage)
    this.committedRevision = initialImage?.revision ?? 0
  }

  static async create(store: AsyncFileSystemStore) {
    return new QueuedFsPersistence(store, await store.load())
  }

  readonly recoveredFromPrevious = false

  load() {
    return this.current && structuredClone(this.current)
  }

  commit(delta: FsDelta) {
    this.current = applyFsDelta(this.current, delta)
    this.pending = mergeFsDelta(this.pending, delta)
    this.updateCurrentRevision()
    if (! this.drainPromise) {
      this.hasWriteError = false
      this.startDrain()
    }
  }

  async flush() {
    if (this.hasWriteError && ! isFsDeltaEmpty(this.pending) && ! this.drainPromise) {
      this.hasWriteError = false
      this.startDrain()
    }
    while (this.drainPromise) await this.drainPromise
    if (this.hasWriteError) throw this.writeError
  }

  private startDrain() {
    this.drainPromise = Promise.resolve()
      .then(() => this.drain())
      .catch((error: unknown) => {
        this.writeError = error
        this.hasWriteError = true
      })
      .finally(() => {
        this.drainPromise = undefined
        if (! isFsDeltaEmpty(this.pending) && ! this.hasWriteError) this.startDrain()
      })
  }

  private async drain() {
    while (! isFsDeltaEmpty(this.pending)) {
      const delta = cloneFsDelta(this.pending)
      this.pending = createFsDelta()
      this.isCommitInFlight = true
      this.updateCurrentRevision()
      try {
        this.committedRevision = await this.store.commit(delta, this.committedRevision)
        this.isCommitInFlight = false
        this.updateCurrentRevision()
      }
      catch (error) {
        this.isCommitInFlight = false
        this.pending = mergeFsDelta(delta, this.pending)
        this.updateCurrentRevision()
        throw error
      }
    }
  }

  private updateCurrentRevision() {
    if (! this.current) return
    this.current.revision = this.committedRevision
      + (this.isCommitInFlight ? 1 : 0)
      + (isFsDeltaEmpty(this.pending) ? 0 : 1)
  }
}
