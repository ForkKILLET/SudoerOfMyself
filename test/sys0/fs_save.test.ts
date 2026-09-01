import { describe, expect, it } from 'vitest'
import {
  assertFileSystemSnapshot,
  createFileSystemSaveArchive,
  FILE_SYSTEM_SNAPSHOT_FORMAT,
  FILE_SYSTEM_SNAPSHOT_VERSION,
  FileSystemSnapshot,
  serializeFileSystemSave,
} from '@/sys0/fs/save'
import { FileT } from '@/sys0/fs'

const snapshot: FileSystemSnapshot = {
  format: FILE_SYSTEM_SNAPSHOT_FORMAT,
  version: FILE_SYSTEM_SNAPSHOT_VERSION,
  generation: 3,
  rootIid: 1,
  inodes: [{ iid: 1, file: { type: FileT.DIR, entries: {} } }],
}

describe('file-system save recovery', () => {
  it('exports a backend-independent snapshot', () => {
    const exportedAt = new Date('2026-08-24T00:00:00.000Z')
    const archive = createFileSystemSaveArchive(snapshot, exportedAt)

    expect(archive).toEqual({
      format: 'sudoer-of-myself/file-system-save',
      version: 1,
      exportedAt: '2026-08-24T00:00:00.000Z',
      snapshot,
    })
    expect(JSON.parse(serializeFileSystemSave(snapshot, exportedAt))).toEqual(archive)
  })

  it('can export an invalid raw snapshot from recovery mode', () => {
    const invalidSnapshot = { broken: true }
    const previousSnapshot = { generation: 2 }

    const archive = createFileSystemSaveArchive(invalidSnapshot, new Date(), previousSnapshot)
    expect(archive.snapshot).toEqual(invalidSnapshot)
    expect(archive.previousSnapshot).toEqual(previousSnapshot)
  })

  it('rejects dangling inode references before hydrating the VFS', () => {
    const invalidSnapshot = structuredClone(snapshot)
    invalidSnapshot.inodes[0].file = {
      type: FileT.DIR,
      entries: { missing: 2 },
    }

    expect(() => assertFileSystemSnapshot(invalidSnapshot)).toThrow('dangling inode reference 2')
  })
})
