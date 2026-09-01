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

const createSnapshot = (generation: number): FileSystemSnapshot => ({
  format: FILE_SYSTEM_SNAPSHOT_FORMAT,
  version: FILE_SYSTEM_SNAPSHOT_VERSION,
  generation,
  rootIid: 1,
  inodes: [{ iid: 1, file: { type: FileT.DIR, entries: {} } }],
})

describe('QueuedFsPersistence', () => {
  it('coalesces snapshots queued before a write starts', async () => {
    const saved: FileSystemSnapshot[] = []
    const store: AsyncFileSystemSnapshotStore = {
      load: async () => undefined,
      save: async (snapshot) => { saved.push(structuredClone(snapshot)) },
      clear: async () => {},
    }
    const persistence = await QueuedFsPersistence.create(store)

    persistence.save(createSnapshot(1))
    persistence.save(createSnapshot(2))
    await persistence.flush()

    expect(saved.map(({ generation }) => generation)).toEqual([2])
  })

  it('keeps a failed snapshot available for an explicit retry', async () => {
    let attempts = 0
    const store: AsyncFileSystemSnapshotStore = {
      load: async () => undefined,
      save: async () => {
        attempts ++
        if (attempts === 1) throw new Error('disk unavailable')
      },
      clear: async () => {},
    }
    const persistence = await QueuedFsPersistence.create(store)
    persistence.save(createSnapshot(1))

    await expect(persistence.flush()).rejects.toThrow('disk unavailable')
    await expect(persistence.flush()).resolves.toBeUndefined()
    expect(attempts).toBe(2)
  })
})
