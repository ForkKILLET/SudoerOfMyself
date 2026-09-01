import { describe, expect, it } from 'vitest'
import {
  createFileSystemSaveArchive,
  serializeFileSystemSave,
} from '@/sys0/fs/save'

describe('file-system save recovery', () => {
  it('wraps supplied recovery data in a versioned archive', () => {
    const exportedAt = new Date('2026-08-24T00:00:00.000Z')
    const data = {
      metadata: { revision: 3 },
      inodes: [{ iid: 1 }],
    }
    const archive = createFileSystemSaveArchive(data, exportedAt)

    expect(archive).toEqual({
      format: 'sudoer-of-myself/file-system-save',
      version: 2,
      exportedAt: '2026-08-24T00:00:00.000Z',
      data,
    })
    expect(JSON.parse(serializeFileSystemSave(data, exportedAt))).toEqual(archive)
  })

  it('preserves invalid raw IndexedDB data without interpreting it', () => {
    const invalidData = {
      metadata: { broken: true },
      inodes: [{ iid: 'invalid' }],
    }

    expect(createFileSystemSaveArchive(invalidData).data).toEqual(invalidData)
  })
})
