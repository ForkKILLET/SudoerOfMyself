import { assertFileSystemSnapshot, type FileSystemSnapshot } from './save'
import {
  applyFsDelta,
  type FileSystemImage,
  FILE_SYSTEM_IMAGE_FORMAT,
  FILE_SYSTEM_IMAGE_VERSION,
  type FsDelta,
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

export interface AsyncFileSystemSnapshotStore {
  load(): Promise<unknown | undefined>
  loadPrevious(): Promise<unknown | undefined>
  save(snapshot: FileSystemSnapshot): Promise<void>
  restore(snapshot: FileSystemSnapshot): Promise<void>
  clear(): Promise<void>
}

export class QueuedFsPersistence implements FsPersistence {
  private current: FileSystemImage | undefined
  private pending: FileSystemImage | undefined
  private drainPromise: Promise<void> | undefined
  private writeError: unknown
  private hasWriteError = false

  private constructor(
    private readonly store: AsyncFileSystemSnapshotStore,
    initialImage: FileSystemImage | undefined,
    readonly recoveredFromPrevious: boolean,
  ) {
    this.current = initialImage && structuredClone(initialImage)
  }

  static async create(store: AsyncFileSystemSnapshotStore) {
    const snapshot = await store.load()
    if (snapshot === undefined) return new QueuedFsPersistence(store, undefined, false)

    try {
      assertFileSystemSnapshot(snapshot)
      return new QueuedFsPersistence(store, snapshotToImage(snapshot), false)
    }
    catch (currentError) {
      const previous = await store.loadPrevious()
      if (previous === undefined) throw currentError
      try {
        assertFileSystemSnapshot(previous)
      }
      catch (previousError) {
        throw new AggregateError(
          [currentError, previousError],
          'Current and previous file-system snapshots are invalid',
        )
      }
      await store.restore(previous)
      return new QueuedFsPersistence(store, snapshotToImage(previous), true)
    }
  }

  load() {
    return this.current && structuredClone(this.current)
  }

  commit(delta: FsDelta) {
    const image = applyFsDelta(this.current, delta)
    this.current = image
    this.pending = image
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
      const image = this.pending
      this.pending = undefined
      try {
        await this.store.save(imageToSnapshot(image))
      }
      catch (error) {
        this.pending ??= image
        throw error
      }
    }
  }
}

const snapshotToImage = (snapshot: FileSystemSnapshot): FileSystemImage => ({
  format: FILE_SYSTEM_IMAGE_FORMAT,
  version: FILE_SYSTEM_IMAGE_VERSION,
  revision: snapshot.generation,
  rootIid: snapshot.rootIid,
  inodes: structuredClone(snapshot.inodes),
})

const imageToSnapshot = (image: FileSystemImage): FileSystemSnapshot => ({
  format: FILE_SYSTEM_IMAGE_FORMAT,
  version: FILE_SYSTEM_IMAGE_VERSION,
  generation: image.revision,
  rootIid: image.rootIid,
  inodes: structuredClone(image.inodes),
})
