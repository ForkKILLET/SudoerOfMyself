import { describe, expect, it } from 'vitest'
import { FileT } from '@/sys0/fs'
import {
  type AsyncFileSystemStore,
  QueuedFsPersistence,
} from '@/sys0/fs/persistence'
import {
  cloneFsDelta,
  createPutDelta,
  createReplaceAllDelta,
  FILE_SYSTEM_IMAGE_FORMAT,
  FILE_SYSTEM_IMAGE_VERSION,
  type FileSystemImage,
  type FileSystemReplacement,
  type FsDelta,
} from '@/sys0/fs/image'

const createReplacement = (): FileSystemReplacement => ({
  format: FILE_SYSTEM_IMAGE_FORMAT,
  version: FILE_SYSTEM_IMAGE_VERSION,
  rootIid: 1,
  inodes: [{ iid: 1, file: { type: FileT.DIR, entries: {} } }],
})

const createImage = (revision: number): FileSystemImage => ({
  ...createReplacement(),
  revision,
})

describe('QueuedFsPersistence', () => {
  it('coalesces deltas queued before a write starts', async () => {
    const commits: Array<{ delta: FsDelta, expectedRevision: number }> = []
    const store: AsyncFileSystemStore = {
      load: async () => undefined,
      commit: async (delta, expectedRevision) => {
        commits.push({ delta: cloneFsDelta(delta), expectedRevision })
        return expectedRevision + 1
      },
      clear: async () => {},
    }
    const persistence = await QueuedFsPersistence.create(store)

    persistence.commit(createReplaceAllDelta(createReplacement()))
    persistence.commit(createPutDelta({ iid: 1, file: { type: FileT.DIR, entries: {} } }))
    expect(persistence.load()?.revision).toBe(1)
    await persistence.flush()

    expect(commits).toHaveLength(1)
    expect(commits[0]?.expectedRevision).toBe(0)
    expect(commits[0]?.delta.replaceAll).toEqual(createReplacement())
    expect([...commits[0]?.delta.puts.keys() ?? []]).toEqual([1])
    expect(persistence.load()?.revision).toBe(1)
  })

  it('keeps a failed delta available for an explicit retry', async () => {
    let attempts = 0
    const store: AsyncFileSystemStore = {
      load: async () => undefined,
      commit: async (_delta, expectedRevision) => {
        attempts ++
        if (attempts === 1) throw new Error('disk unavailable')
        return expectedRevision + 1
      },
      clear: async () => {},
    }
    const persistence = await QueuedFsPersistence.create(store)
    persistence.commit(createReplaceAllDelta(createReplacement()))

    await expect(persistence.flush()).rejects.toThrow('disk unavailable')
    await expect(persistence.flush()).resolves.toBeUndefined()
    expect(attempts).toBe(2)
  })

  it('commits against the loaded image revision', async () => {
    const expectedRevisions: number[] = []
    const store: AsyncFileSystemStore = {
      load: async () => createImage(7),
      commit: async (_delta, expectedRevision) => {
        expectedRevisions.push(expectedRevision)
        return expectedRevision + 1
      },
      clear: async () => {},
    }
    const persistence = await QueuedFsPersistence.create(store)

    persistence.commit(createPutDelta({ iid: 1, file: { type: FileT.DIR, entries: {} } }))
    await persistence.flush()

    expect(expectedRevisions).toEqual([7])
  })
})
