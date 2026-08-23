import { describe, expect, it } from 'vitest'
import {
  createFileSystemSaveArchive,
  resetFileSystemSave,
  serializeFileSystemSave,
} from '@/sys0/fs/save'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('file-system save recovery', () => {
  it('exports raw save values even when an inode contains invalid JSON', () => {
    const storage = new MemoryStorage()
    storage.setItem('fs:initialized', 'true')
    storage.setItem('i:1', '{broken json')
    storage.setItem('unrelated', 'keep me')
    const exportedAt = new Date('2026-08-24T00:00:00.000Z')

    const archive = createFileSystemSaveArchive(storage, exportedAt)

    expect(archive).toEqual({
      format: 'sudoer-of-myself/file-system-save',
      version: 1,
      exportedAt: '2026-08-24T00:00:00.000Z',
      entries: {
        'fs:initialized': 'true',
        'i:1': '{broken json',
      },
    })
    expect(JSON.parse(serializeFileSystemSave(storage, exportedAt))).toEqual(archive)
  })

  it('resets only file-system save keys', () => {
    const storage = new MemoryStorage()
    storage.setItem('fs:initialized', 'true')
    storage.setItem('fs:future-metadata', 'value')
    storage.setItem('i:1', 'inode')
    storage.setItem('unrelated', 'keep me')

    resetFileSystemSave(storage)

    expect(storage.getItem('fs:initialized')).toBeNull()
    expect(storage.getItem('fs:future-metadata')).toBeNull()
    expect(storage.getItem('i:1')).toBeNull()
    expect(storage.getItem('unrelated')).toBe('keep me')
  })
})
