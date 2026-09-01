export interface FileSystemSaveArchive {
  format: 'sudoer-of-myself/file-system-save'
  version: 2
  exportedAt: string
  data: unknown
}

export const createFileSystemSaveArchive = (
  data: unknown,
  exportedAt = new Date(),
): FileSystemSaveArchive => ({
  format: 'sudoer-of-myself/file-system-save',
  version: 2,
  exportedAt: exportedAt.toISOString(),
  data,
})

export const serializeFileSystemSave = (
  data: unknown,
  exportedAt = new Date(),
) => (
  JSON.stringify(createFileSystemSaveArchive(data, exportedAt), null, 2)
)
