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
  it('wraps supplied recovery data in a versioned archive', () => {
    const exportedAt = new Date('2026-08-24T00:00:00.000Z')
    const archive = createFileSystemSaveArchive(snapshot, exportedAt)

    expect(archive).toEqual({
      format: 'sudoer-of-myself/file-system-save',
      version: 2,
      exportedAt: '2026-08-24T00:00:00.000Z',
      data: snapshot,
    })
    expect(JSON.parse(serializeFileSystemSave(snapshot, exportedAt))).toEqual(archive)
  })

  it('can export an invalid raw snapshot from recovery mode', () => {
    const invalidData = {
      metadata: { broken: true },
      inodes: [{ iid: 'invalid' }],
    }

    const archive = createFileSystemSaveArchive(invalidData)
    expect(archive.data).toEqual(invalidData)
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
