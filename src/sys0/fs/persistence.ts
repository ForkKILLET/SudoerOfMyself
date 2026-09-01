import { assertFileSystemSnapshot, type FileSystemSnapshot } from './save'

export interface FsPersistence {
  load(): FileSystemSnapshot | undefined
  save(snapshot: FileSystemSnapshot): void
  flush(): Promise<void>
}

export class MemoryFsPersistence implements FsPersistence {
  private snapshot: FileSystemSnapshot | undefined

  load() {
    return this.snapshot && structuredClone(this.snapshot)
  }

  save(snapshot: FileSystemSnapshot) {
    this.snapshot = structuredClone(snapshot)
  }

  async flush() {}
}

export interface AsyncFileSystemSnapshotStore {
  load(): Promise<unknown | undefined>
  save(snapshot: FileSystemSnapshot): Promise<void>
  clear(): Promise<void>
}

export class QueuedFsPersistence implements FsPersistence {
  private current: FileSystemSnapshot | undefined
  private pending: FileSystemSnapshot | undefined
  private drainPromise: Promise<void> | undefined
  private writeError: unknown
  private hasWriteError = false

  private constructor(
    private readonly store: AsyncFileSystemSnapshotStore,
    initialSnapshot: FileSystemSnapshot | undefined,
  ) {
    this.current = initialSnapshot && structuredClone(initialSnapshot)
  }

  static async create(store: AsyncFileSystemSnapshotStore) {
    const snapshot = await store.load()
    if (snapshot !== undefined) assertFileSystemSnapshot(snapshot)
    return new QueuedFsPersistence(store, snapshot)
  }

  load() {
    return this.current && structuredClone(this.current)
  }

  save(snapshot: FileSystemSnapshot) {
    const copy = structuredClone(snapshot)
    this.current = copy
    this.pending = copy
    if (! this.drainPromise) {
      this.hasWriteError = false
      this.startDrain()
    }
  }

  async flush() {
    if (this.hasWriteError && this.pending && ! this.drainPromise) {
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
        if (this.pending && ! this.hasWriteError) this.startDrain()
      })
  }

  private async drain() {
    while (this.pending) {
      const snapshot = this.pending
      this.pending = undefined
      try {
        await this.store.save(snapshot)
      }
      catch (error) {
        this.pending ??= snapshot
        throw error
      }
    }
  }
}
