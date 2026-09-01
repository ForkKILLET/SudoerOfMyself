import type { Inode, InodeId } from '.'

export const FILE_SYSTEM_IMAGE_FORMAT = 'sudoer-of-myself/file-system'
export const FILE_SYSTEM_IMAGE_VERSION = 1

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
