import { describe, expect, it } from 'vitest'
import { FileT } from '@/sys0/fs'
import {
  AsyncFileSystemSnapshotStore,
  QueuedFsPersistence,
} from '@/sys0/fs/persistence'
import {
  FILE_SYSTEM_SNAPSHOT_FORMAT,
  FILE_SYSTEM_SNAPSHOT_VERSION,
  FileSystemSnapshot,
} from '@/sys0/fs/save'
import {
  createPutDelta,
  createReplaceAllDelta,
  FILE_SYSTEM_IMAGE_FORMAT,
  FILE_SYSTEM_IMAGE_VERSION,
  type FileSystemReplacement,
} from '@/sys0/fs/image'

const createSnapshot = (generation: number): FileSystemSnapshot => ({
  format: FILE_SYSTEM_SNAPSHOT_FORMAT,
  version: FILE_SYSTEM_SNAPSHOT_VERSION,
  generation,
  rootIid: 1,
  inodes: [{ iid: 1, file: { type: FileT.DIR, entries: {} } }],
})

const createReplacement = (): FileSystemReplacement => ({
  format: FILE_SYSTEM_IMAGE_FORMAT,
  version: FILE_SYSTEM_IMAGE_VERSION,
  rootIid: 1,
  inodes: [{ iid: 1, file: { type: FileT.DIR, entries: {} } }],
})

describe('QueuedFsPersistence', () => {
  it('coalesces snapshots queued before a write starts', async () => {
    const saved: FileSystemSnapshot[] = []
    const store: AsyncFileSystemSnapshotStore = {
      load: async () => undefined,
      loadPrevious: async () => undefined,
      save: async (snapshot) => { saved.push(structuredClone(snapshot)) },
      restore: async () => {},
      clear: async () => {},
    }
    const persistence = await QueuedFsPersistence.create(store)

    persistence.commit(createReplaceAllDelta(createReplacement()))
    persistence.commit(createPutDelta({ iid: 1, file: { type: FileT.DIR, entries: {} } }))
    await persistence.flush()

    expect(saved.map(({ generation }) => generation)).toEqual([2])
  })

  it('keeps a failed snapshot available for an explicit retry', async () => {
    let attempts = 0
    const store: AsyncFileSystemSnapshotStore = {
      load: async () => undefined,
      loadPrevious: async () => undefined,
      save: async () => {
        attempts ++
        if (attempts === 1) throw new Error('disk unavailable')
      },
      restore: async () => {},
      clear: async () => {},
    }
    const persistence = await QueuedFsPersistence.create(store)
    persistence.commit(createReplaceAllDelta(createReplacement()))

    await expect(persistence.flush()).rejects.toThrow('disk unavailable')
    await expect(persistence.flush()).resolves.toBeUndefined()
    expect(attempts).toBe(2)
  })

  it('restores the previous snapshot when the current one is invalid', async () => {
    const previous = createSnapshot(3)
    let restored: FileSystemSnapshot | undefined
    const store: AsyncFileSystemSnapshotStore = {
      load: async () => ({ broken: true }),
      loadPrevious: async () => previous,
      save: async () => {},
      restore: async (snapshot) => { restored = structuredClone(snapshot) },
      clear: async () => {},
    }

    const persistence = await QueuedFsPersistence.create(store)

    expect(persistence.recoveredFromPrevious).toBe(true)
    expect(persistence.load()).toEqual({
      ...createReplacement(),
      revision: previous.generation,
    })
    expect(restored).toEqual(previous)
  })

  it('rejects startup when both retained snapshots are invalid', async () => {
    const store: AsyncFileSystemSnapshotStore = {
      load: async () => ({ broken: 'current' }),
      loadPrevious: async () => ({ broken: 'previous' }),
      save: async () => {},
      restore: async () => {},
      clear: async () => {},
    }

    await expect(QueuedFsPersistence.create(store)).rejects.toThrow(
      'Current and previous file-system snapshots are invalid',
    )
  })
})
