import { describe, expect, it } from 'vitest'
import { FileT, type Inode } from '@/sys0/fs'
import {
  applyFsDelta,
  assertFileSystemImage,
  createDeleteDelta,
  createPutDelta,
  createReplaceAllDelta,
  type FileSystemReplacement,
  FILE_SYSTEM_IMAGE_FORMAT,
  FILE_SYSTEM_IMAGE_VERSION,
  isFsDeltaEmpty,
  mergeFsDelta,
} from '@/sys0/fs/image'

const metadata = { createdAt: 0, modifiedAt: 0 }

const normalInode = (iid: number, content: string): Inode => ({
  iid,
  file: { type: FileT.NORMAL, content },
  metadata,
})

const replacement = (content: string): FileSystemReplacement => ({
  format: FILE_SYSTEM_IMAGE_FORMAT,
  version: FILE_SYSTEM_IMAGE_VERSION,
  rootIid: 1,
  inodes: [
    { iid: 1, file: { type: FileT.DIR as const, entries: { file: 2 } }, metadata },
    normalInode(2, content),
  ],
})

describe('FsDelta merging', () => {
  it('lets a later put replace earlier operations for the same inode', () => {
    const deletedThenPut = mergeFsDelta(
      createDeleteDelta(2),
      createPutDelta(normalInode(2, 'new')),
    )
    const putTwice = mergeFsDelta(
      createPutDelta(normalInode(2, 'old')),
      createPutDelta(normalInode(2, 'new')),
    )

    expect(deletedThenPut.deletes.has(2)).toBe(false)
    expect(deletedThenPut.puts.get(2)).toEqual(normalInode(2, 'new'))
    expect(putTwice.puts.get(2)).toEqual(normalInode(2, 'new'))
  })

  it('lets a later delete remove an earlier put', () => {
    const delta = mergeFsDelta(
      createPutDelta(normalInode(2, 'old')),
      createDeleteDelta(2),
    )

    expect(delta.puts.has(2)).toBe(false)
    expect(delta.deletes).toEqual(new Set([2]))
  })

  it('discards all earlier operations when replaceAll occurs later', () => {
    const delta = mergeFsDelta(
      createPutDelta(normalInode(9, 'discarded')),
      createReplaceAllDelta(replacement('replacement')),
    )

    expect(delta.replaceAll).toEqual(replacement('replacement'))
    expect(delta.puts.size).toBe(0)
    expect(delta.deletes.size).toBe(0)
  })

  it('retains an earlier replaceAll while applying later patches', () => {
    const delta = mergeFsDelta(
      createReplaceAllDelta(replacement('base')),
      createPutDelta(normalInode(2, 'patched')),
    )

    expect(delta.replaceAll).toEqual(replacement('base'))
    expect(delta.puts.get(2)).toEqual(normalInode(2, 'patched'))
    expect(isFsDeltaEmpty(delta)).toBe(false)
  })

  it('clones inode values while merging', () => {
    const inode = normalInode(2, 'original')
    const delta = mergeFsDelta(createDeleteDelta(3), createPutDelta(inode))
    if (inode.file.type === FileT.NORMAL) inode.file.content = 'mutated'

    expect(delta.puts.get(2)).toEqual(normalInode(2, 'original'))
  })
})

describe('FsDelta application', () => {
  it('builds an initial revision from replaceAll', () => {
    const image = applyFsDelta(undefined, createReplaceAllDelta(replacement('initial')))

    expect(image.revision).toBe(1)
    expect(image.inodes).toEqual(replacement('initial').inodes)
  })

  it('atomically applies deletes and puts to a new revision', () => {
    const initial = applyFsDelta(undefined, createReplaceAllDelta(replacement('initial')))
    const patch = mergeFsDelta(
      createDeleteDelta(2),
      createPutDelta(normalInode(3, 'new')),
    )
    const next = applyFsDelta(initial, patch)

    expect(next.revision).toBe(2)
    expect(next.inodes.map(({ iid }) => iid)).toEqual([1, 3])
    expect(initial.inodes.map(({ iid }) => iid)).toEqual([1, 2])
  })

  it('rejects a patch without an existing image', () => {
    expect(() => applyFsDelta(undefined, createPutDelta(normalInode(2, 'orphan')))).toThrow(
      'without an existing image',
    )
  })
})

describe('FileSystemImage validation', () => {
  it('requires valid inode timestamps', () => {
    const image = { ...replacement('data'), revision: 1 }
    const missingMetadata = structuredClone(image) as unknown as {
      inodes: Array<Record<string, unknown>>
    }
    delete missingMetadata.inodes[0].metadata

    expect(() => assertFileSystemImage(missingMetadata)).toThrow('invalid metadata')
    expect(() => assertFileSystemImage({
      ...image,
      inodes: image.inodes.map(inode => inode.iid === 2
        ? { ...inode, metadata: { ...metadata, modifiedAt: - 1 } }
        : inode),
    })).toThrow('invalid modification time')
  })

  it('rejects invalid revisions and dangling inode references', () => {
    expect(() => assertFileSystemImage({
      ...replacement('data'),
      revision: - 1,
    })).toThrow('invalid revision')
    expect(() => assertFileSystemImage({
      ...replacement('data'),
      revision: 1,
      inodes: [{ iid: 1, file: { type: FileT.DIR, entries: { missing: 9 } }, metadata }],
    })).toThrow('dangling inode reference 9')
  })
})
