export const FS_INITIALIZED_KEY = 'fs:initialized'
export const FS_INODE_KEY_PREFIX = 'i:'

export const isFileSystemSaveKey = (key: string) => (
  key.startsWith('fs:') || key.startsWith(FS_INODE_KEY_PREFIX)
)

export interface FileSystemSaveArchive {
  format: 'sudoer-of-myself/file-system-save'
  version: 1
  exportedAt: string
  entries: Record<string, string>
}

const getFileSystemSaveKeys = (storage: Storage) => {
  const keys: string[] = []
  for (let index = 0; index < storage.length; index ++) {
    const key = storage.key(index)
    if (key && isFileSystemSaveKey(key)) keys.push(key)
  }
  return keys.sort()
}

export const createFileSystemSaveArchive = (
  storage: Storage,
  exportedAt = new Date(),
): FileSystemSaveArchive => ({
  format: 'sudoer-of-myself/file-system-save',
  version: 1,
  exportedAt: exportedAt.toISOString(),
  entries: Object.fromEntries(
    getFileSystemSaveKeys(storage).flatMap((key) => {
      const value = storage.getItem(key)
      return value === null ? [] : [[key, value]]
    }),
  ),
})

export const serializeFileSystemSave = (storage: Storage, exportedAt = new Date()) => (
  JSON.stringify(createFileSystemSaveArchive(storage, exportedAt), null, 2)
)

export const resetFileSystemSave = (storage: Storage) => {
  getFileSystemSaveKeys(storage).forEach(key => storage.removeItem(key))
}
