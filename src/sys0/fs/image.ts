import type { Inode, InodeId } from '.'

export const FILE_SYSTEM_IMAGE_FORMAT = 'sudoer-of-myself/file-system'
export const FILE_SYSTEM_IMAGE_VERSION = 2

export interface FileSystemImage {
  format: typeof FILE_SYSTEM_IMAGE_FORMAT
  version: typeof FILE_SYSTEM_IMAGE_VERSION
  revision: number
  rootIid: InodeId
  inodes: Inode[]
}

export type FileSystemReplacement = Omit<FileSystemImage, 'revision'>

export interface FsDelta {
  replaceAll?: FileSystemReplacement
  puts: Map<InodeId, Inode>
  deletes: Set<InodeId>
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
)

const invalidImage = (reason: string): never => {
  throw new Error(`Invalid file-system image: ${reason}`)
}

export function assertFileSystemImage(value: unknown): asserts value is FileSystemImage {
  if (! isRecord(value)) invalidImage('expected an object')
  const image = value as Record<string, unknown>
  if (image.format !== FILE_SYSTEM_IMAGE_FORMAT) invalidImage('unknown format')
  if (image.version !== FILE_SYSTEM_IMAGE_VERSION) invalidImage('unsupported version')
  if (! Number.isSafeInteger(image.revision) || (image.revision as number) < 0) {
    invalidImage('invalid revision')
  }
  if (! Number.isSafeInteger(image.rootIid) || (image.rootIid as number) < 1) {
    invalidImage('invalid root inode')
  }
  if (! Array.isArray(image.inodes)) invalidImage('inodes must be an array')

  const inodeIds = new Set<number>()
  const directoryReferences: number[] = []
  let rootIsDirectory = false

  const inodes = image.inodes as unknown[]
  inodes.forEach((candidate: unknown, index: number) => {
    if (! isRecord(candidate)) invalidImage(`inode ${index} is not an object`)
    const { iid, file, metadata, executable } = candidate as Record<string, unknown>
    if (! Number.isSafeInteger(iid) || (iid as number) < 1) {
      invalidImage(`inode ${index} has an invalid id`)
    }
    if (inodeIds.has(iid as number)) invalidImage(`duplicate inode ${String(iid)}`)
    inodeIds.add(iid as number)

    if (! isRecord(metadata)) invalidImage(`inode ${String(iid)} has invalid metadata`)
    const { createdAt, modifiedAt } = metadata as Record<string, unknown>
    if (! Number.isFinite(createdAt) || (createdAt as number) < 0) {
      invalidImage(`inode ${String(iid)} has an invalid creation time`)
    }
    if (! Number.isFinite(modifiedAt) || (modifiedAt as number) < 0) {
      invalidImage(`inode ${String(iid)} has an invalid modification time`)
    }

    if (! isRecord(file)) invalidImage(`inode ${String(iid)} has no file`)
    const fileRecord = file as Record<string, unknown>
    if (fileRecord.type === 0) {
      if (! isRecord(fileRecord.entries)) invalidImage(`directory inode ${String(iid)} has invalid entries`)
      Object.values(fileRecord.entries as Record<string, unknown>).forEach((childIid) => {
        if (! Number.isSafeInteger(childIid) || (childIid as number) < 1) {
          invalidImage(`directory inode ${String(iid)} contains an invalid reference`)
        }
        directoryReferences.push(childIid as number)
      })
      if (iid === image.rootIid) rootIsDirectory = true
    }
    else if (fileRecord.type === 1) {
      if (typeof fileRecord.content !== 'string') invalidImage(`file inode ${String(iid)} has invalid content`)
    }
    else invalidImage(`inode ${String(iid)} has an unknown file type`)

    if (executable !== undefined) {
      if (! isRecord(executable)) invalidImage(`inode ${String(iid)} has an invalid executable descriptor`)
      const executableRecord = executable as Record<string, unknown>
      if (executableRecord.format !== 'native' || typeof executableRecord.programId !== 'string') {
        invalidImage(`inode ${String(iid)} has an invalid executable descriptor`)
      }
    }
  })

  if (! inodeIds.has(image.rootIid as number)) invalidImage('root inode is missing')
  if (! rootIsDirectory) invalidImage('root inode is not a directory')
  const danglingIid = directoryReferences.find(iid => ! inodeIds.has(iid))
  if (danglingIid !== undefined) invalidImage(`dangling inode reference ${danglingIid}`)
}

export const createFsDelta = (): FsDelta => ({
  puts: new Map(),
  deletes: new Set(),
})

export const createReplaceAllDelta = (
  replacement: FileSystemReplacement,
): FsDelta => ({
  replaceAll: structuredClone(replacement),
  puts: new Map(),
  deletes: new Set(),
})

export const createPutDelta = (inode: Inode): FsDelta => ({
  puts: new Map([[inode.iid, structuredClone(inode)]]),
  deletes: new Set(),
})

export const createPutsDelta = (inodes: Iterable<Inode>): FsDelta => ({
  puts: new Map(
    [...inodes].map(inode => [inode.iid, structuredClone(inode)]),
  ),
  deletes: new Set(),
})

export const createDeleteDelta = (iid: InodeId): FsDelta => ({
  puts: new Map(),
  deletes: new Set([iid]),
})

export const cloneFsDelta = (delta: FsDelta): FsDelta => ({
  ...(delta.replaceAll ? { replaceAll: structuredClone(delta.replaceAll) } : {}),
  puts: new Map(
    [...delta.puts].map(([iid, inode]) => [iid, structuredClone(inode)]),
  ),
  deletes: new Set(delta.deletes),
})

export const mergeFsDelta = (earlier: FsDelta, later: FsDelta): FsDelta => {
  const merged = later.replaceAll
    ? createReplaceAllDelta(later.replaceAll)
    : cloneFsDelta(earlier)

  later.deletes.forEach((iid) => {
    merged.puts.delete(iid)
    merged.deletes.add(iid)
  })
  later.puts.forEach((inode, iid) => {
    merged.deletes.delete(iid)
    merged.puts.set(iid, structuredClone(inode))
  })
  return merged
}

export const isFsDeltaEmpty = (delta: FsDelta) => (
  ! delta.replaceAll && delta.puts.size === 0 && delta.deletes.size === 0
)

export const applyFsDelta = (
  image: FileSystemImage | undefined,
  delta: FsDelta,
): FileSystemImage => {
  if (! image && ! delta.replaceAll) {
    throw new Error('Cannot apply a file-system patch without an existing image')
  }

  const base = delta.replaceAll ?? image
  if (! base) throw new Error('File-system delta has no base image')
  const inodes = new Map(
    base.inodes.map(inode => [inode.iid, structuredClone(inode)]),
  )
  delta.deletes.forEach(iid => inodes.delete(iid))
  delta.puts.forEach((inode, iid) => inodes.set(iid, structuredClone(inode)))

  return {
    format: FILE_SYSTEM_IMAGE_FORMAT,
    version: FILE_SYSTEM_IMAGE_VERSION,
    revision: (image?.revision ?? 0) + 1,
    rootIid: base.rootIid,
    inodes: [...inodes.values()],
  }
}
