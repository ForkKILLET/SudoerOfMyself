import type { Inode } from '.'

export const FILE_SYSTEM_SNAPSHOT_FORMAT = 'sudoer-of-myself/file-system'
export const FILE_SYSTEM_SNAPSHOT_VERSION = 1

export interface FileSystemSnapshot {
  format: typeof FILE_SYSTEM_SNAPSHOT_FORMAT
  version: typeof FILE_SYSTEM_SNAPSHOT_VERSION
  generation: number
  rootIid: number
  inodes: Inode[]
}

export interface FileSystemSaveArchive {
  format: 'sudoer-of-myself/file-system-save'
  version: 1
  exportedAt: string
  snapshot: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
)

const invalidSnapshot = (reason: string): never => {
  throw new Error(`Invalid file-system snapshot: ${reason}`)
}

export function assertFileSystemSnapshot(value: unknown): asserts value is FileSystemSnapshot {
  if (! isRecord(value)) invalidSnapshot('expected an object')
  const snapshot = value as Record<string, unknown>
  if (snapshot.format !== FILE_SYSTEM_SNAPSHOT_FORMAT) invalidSnapshot('unknown format')
  if (snapshot.version !== FILE_SYSTEM_SNAPSHOT_VERSION) invalidSnapshot('unsupported version')
  if (! Number.isSafeInteger(snapshot.generation) || (snapshot.generation as number) < 0) {
    invalidSnapshot('invalid generation')
  }
  if (! Number.isSafeInteger(snapshot.rootIid) || (snapshot.rootIid as number) < 1) {
    invalidSnapshot('invalid root inode')
  }
  if (! Array.isArray(snapshot.inodes)) invalidSnapshot('inodes must be an array')

  const inodeIds = new Set<number>()
  const directoryReferences: number[] = []
  let rootIsDirectory = false

  const inodes = snapshot.inodes as unknown[]
  inodes.forEach((candidate: unknown, index: number) => {
    if (! isRecord(candidate)) invalidSnapshot(`inode ${index} is not an object`)
    const { iid, file, executable } = candidate as Record<string, unknown>
    if (! Number.isSafeInteger(iid) || (iid as number) < 1) {
      invalidSnapshot(`inode ${index} has an invalid id`)
    }
    if (inodeIds.has(iid as number)) invalidSnapshot(`duplicate inode ${String(iid)}`)
    inodeIds.add(iid as number)

    if (! isRecord(file)) invalidSnapshot(`inode ${String(iid)} has no file`)
    const fileRecord = file as Record<string, unknown>
    if (fileRecord.type === 0) {
      if (! isRecord(fileRecord.entries)) invalidSnapshot(`directory inode ${String(iid)} has invalid entries`)
      Object.values(fileRecord.entries as Record<string, unknown>).forEach((childIid) => {
        if (! Number.isSafeInteger(childIid) || (childIid as number) < 1) {
          invalidSnapshot(`directory inode ${String(iid)} contains an invalid reference`)
        }
        directoryReferences.push(childIid as number)
      })
      if (iid === snapshot.rootIid) rootIsDirectory = true
    }
    else if (fileRecord.type === 1) {
      if (typeof fileRecord.content !== 'string') invalidSnapshot(`file inode ${String(iid)} has invalid content`)
    }
    else invalidSnapshot(`inode ${String(iid)} has an unknown file type`)

    if (executable !== undefined) {
      if (! isRecord(executable)) invalidSnapshot(`inode ${String(iid)} has an invalid executable descriptor`)
      const executableRecord = executable as Record<string, unknown>
      if (executableRecord.format !== 'native' || typeof executableRecord.programId !== 'string') {
        invalidSnapshot(`inode ${String(iid)} has an invalid executable descriptor`)
      }
    }
  })

  if (! inodeIds.has(snapshot.rootIid as number)) invalidSnapshot('root inode is missing')
  if (! rootIsDirectory) invalidSnapshot('root inode is not a directory')
  const danglingIid = directoryReferences.find(iid => ! inodeIds.has(iid))
  if (danglingIid !== undefined) invalidSnapshot(`dangling inode reference ${danglingIid}`)
}

export const createFileSystemSaveArchive = (
  snapshot: unknown,
  exportedAt = new Date(),
): FileSystemSaveArchive => ({
  format: 'sudoer-of-myself/file-system-save',
  version: 1,
  exportedAt: exportedAt.toISOString(),
  snapshot,
})

export const serializeFileSystemSave = (snapshot: unknown, exportedAt = new Date()) => (
  JSON.stringify(createFileSystemSaveArchive(snapshot, exportedAt), null, 2)
)
