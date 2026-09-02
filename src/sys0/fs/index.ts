import { Bitmap } from '@/utils/bitmap'
import { Awaitable, Pred } from '@/utils/types'
import { Err, Ok, Result } from 'fk-result'
import { UserError } from '@/utils/errors'

import { FileMode, FileHandleFromMode, FILE_HANDLE_FROM_MODE } from './file_handle'
import { FsPersistence, MemoryFsPersistence } from './persistence'
import { Vfs } from './vfs'
import { Path } from './path'
import {
  assertFileSystemImage,
  createDeleteDelta,
  createFsDelta,
  createPutsDelta,
  createPutDelta,
  createReplaceAllDelta,
  FILE_SYSTEM_IMAGE_FORMAT,
  FILE_SYSTEM_IMAGE_VERSION,
  FileSystemReplacement,
  FsDelta,
  mergeFsDelta,
} from './image'

export const enum FileT {
  DIR,
  NORMAL,
}

export const FileTNames: Record<FileT, string> = {
  [FileT.DIR]: 'directory',
  [FileT.NORMAL]: 'normal file',
}

export const displayFileT = (type: FileT) => {
  return FileTNames[type]
}

export type InodeId = number
export interface InodeMetadata {
  createdAt: number
  modifiedAt: number
}
export interface Inode<F extends File = File> {
  iid: InodeId
  file: F
  metadata: InodeMetadata
  executable?: ExecutableDescriptor
}
export type Inodes = Map<InodeId, Inode>

export type File =
  | DirFile
  | NormalFile

export interface FileLoc<F extends File = File> {
  path: string
  file: F
}

export interface DirEntries {
  [name: string]: InodeId
}

export interface DirFile {
  type: FileT.DIR
  entries: DirEntries
}

export interface FsChild {
  name: string
  iid: InodeId
  inode: Inode | undefined
  file: File | null
}

export interface NormalFile {
  type: FileT.NORMAL
  content: string
}

export interface NativeExecutableDescriptor {
  format: 'native'
  programId: string
}

export type ExecutableDescriptor = NativeExecutableDescriptor

export type FileFromT<FT extends FileT> =
  FT extends FileT.DIR ? DirFile :
    FT extends FileT.NORMAL ? NormalFile :
      never

export interface FReadKeyOptions {
  signal?: AbortSignal
}

export interface FRead {
  readKey(options?: FReadKeyOptions): Awaitable<string>
  read(options?: FReadKeyOptions): Awaitable<string>
  readUntil(pred: Pred<string>, options?: FReadKeyOptions): Awaitable<string>
  readLn(options?: FReadKeyOptions): Awaitable<string>
}

export interface FWrite {
  write(data: string): void
  writeLn(data: string): void
}

export interface FReadWrite extends FRead, FWrite {}

export const MAX_INODE_COUNT = 1024
const SAVE_DEBOUNCE_MS = 25

export interface InodeMaintainer {
  inodes: Inodes
  inodeBitmap: Bitmap
}

export interface FileStat {
  iid: InodeId
  type: FileT
  size: number
  createdAt: number
  modifiedAt: number
  executable: boolean
}

export namespace FOp {
  export const enum T {
    ILLEGAL_NAME,
    NOT_FOUND,
    DANGLING_INODE,
    NOT_DIR,
    IS_A_DIR,
    IS_ROOT,
    NOT_ALLOWED_TYPE,
    ALREADY_EXISTS,
    OUT_OF_INODES,
    READ_ONLY_FILE_SYSTEM,
    AGGREGATED_ERROR,
  }

  export type Error =
    | { type: T.ILLEGAL_NAME }
    | { type: T.NOT_FOUND }
    | { type: T.DANGLING_INODE }
    | { type: T.NOT_DIR }
    | { type: T.IS_A_DIR }
    | { type: T.IS_ROOT }
    | { type: T.NOT_ALLOWED_TYPE, allowedTypes: readonly FileT[] }
    | { type: T.ALREADY_EXISTS }
    | { type: T.OUT_OF_INODES }
    | { type: T.READ_ONLY_FILE_SYSTEM }
    | { type: T.AGGREGATED_ERROR, errors: Error[] }

  export type OperationResult<T> = Result<T, Error>

  export const err = (error: Error): OperationResult<never> => Err(error)
  export const ok = <T>(value: T): OperationResult<T> => Ok(value)

  export const displayError = (err: Error): string => {
    switch (err.type) {
      case T.ILLEGAL_NAME:
        return `Illegal file name`
      case T.NOT_FOUND:
        return `No such file or directory`
      case T.DANGLING_INODE:
        return `Dangling Inode`
      case T.NOT_DIR:
        return `Not a directory`
      case T.IS_A_DIR:
        return `Is a directory`
      case T.IS_ROOT:
        return `Is root directory`
      case T.NOT_ALLOWED_TYPE:
        return `Not ${err.allowedTypes.map(displayFileT).join(' or ')}`
      case T.ALREADY_EXISTS:
        return `File already exists`
      case T.OUT_OF_INODES:
        return `Out of Inodes`
      case T.READ_ONLY_FILE_SYSTEM:
        return `Read-only file system`
      case T.AGGREGATED_ERROR:
        return `Got multiple errors:\n${err.errors.map(err => '  ' + displayError(err)).join('\n')}`
    }
  }

  export type FindInodeResult<F extends File = File> = OperationResult<{
    inode: Inode<F>
    filename: string
    path: string
    parentInode: Inode<DirFile>
  }>
  export type FindResult<F extends File = File> = OperationResult<{
    file: F
    filename: string
    path: string
    parent: DirFile
  }>
  export type MkdirResult = OperationResult<{ dir: DirFile }>
  export type OpenResult<FM extends FileMode> = OperationResult<{ handle: FileHandleFromMode<FM> }>
  export type StatResult = OperationResult<FileStat>
  export type CreateResult<F extends File = File> = OperationResult<{
    inode: Inode<F>
    createdInodes: Inode[]
  }>

  export type RmResult = OperationResult<{ path: string }>

  export interface FindOptions<FT extends FileT = FileT> {
    allowedTypes?: readonly FT[]
    cwd?: string
  }
}

export interface FsMount {
  path: string
  image: Vfs.DirVfile
  readOnly?: boolean
}

interface MountedFs extends FsMount {
  fs: Fs
  name: string
  parent: Inode<DirFile>
}

const FILE_SYSTEM_OWNER = new WeakMap<File, Fs>()

export class Fs {
  inodes: Inodes = new Map()
  inodeBitmap: Bitmap = new Bitmap(MAX_INODE_COUNT)
  rootIid = 1
  get root(): Inode<DirFile> {
    const root = this.inodes.get(this.rootIid)
    if (! root) throw new Error('File system root inode is missing')
    if (root.file.type !== FileT.DIR) throw new Error('File system root inode is not a directory')
    return root as Inode<DirFile>
  }

  readonly persistence: FsPersistence
  readonly isReadOnly: boolean
  private readonly getCwd: () => string
  private readonly now: () => number
  private readonly mounts: MountedFs[] = []
  private readonly mountsByParent = new WeakMap<DirFile, Map<string, MountedFs>>()
  private saveTimer: ReturnType<typeof setTimeout> | undefined
  private pendingDelta = createFsDelta()

  constructor(
    private readonly initialImage: Vfs.DirVfile,
    {
      persistence = new MemoryFsPersistence(),
      getCwd = () => '/',
      mounts = [],
      readOnly = false,
      now = Date.now,
    }: {
      persistence?: FsPersistence
      getCwd?: () => string
      mounts?: readonly FsMount[]
      readOnly?: boolean
      now?: () => number
    } = {},
  ) {
    this.persistence = persistence
    this.getCwd = getCwd
    this.now = now
    this.isReadOnly = readOnly
    this.load()
    mounts.forEach(mount => this.mount(mount))
    if (this.isReadOnly) this.freezeFiles()
  }

  reset() {
    this.inodes.clear()
    this.inodeBitmap.clear()
    this.createInitialImage()
    this.pendingDelta = createReplaceAllDelta(this.createReplacement())
    this.persistNow()
    this.mounts.forEach(mount => this.attachMount(mount))
    if (this.isReadOnly) this.freezeFiles()
  }

  load() {
    const snapshot = this.persistence.load()
    if (! snapshot) {
      this.createInitialImage()
      this.pendingDelta = createReplaceAllDelta(this.createReplacement())
      this.persistNow()
      return
    }

    assertFileSystemImage(snapshot)
    this.rootIid = snapshot.rootIid
    snapshot.inodes.forEach((inode) => {
      if (inode.iid >= MAX_INODE_COUNT) {
        throw new Error(`Invalid file-system snapshot: inode ${inode.iid} is out of range`)
      }
      this.inodes.set(inode.iid, inode)
      this.inodeBitmap.set(inode.iid, 1)
      FILE_SYSTEM_OWNER.set(inode.file, this)
    })
  }

  private createInitialImage() {
    const result = this.createUnchecked(this.initialImage)
    if (result.isErr) throw new Error(`Cannot create initial file system: ${FOp.displayError(result.err)}`)
    this.rootIid = result.val.inode.iid
  }

  exportImage() {
    return {
      ...this.createReplacement(),
      revision: this.persistence.load()?.revision ?? 0,
    }
  }

  private createReplacement(): FileSystemReplacement {
    return {
      format: FILE_SYSTEM_IMAGE_FORMAT,
      version: FILE_SYSTEM_IMAGE_VERSION,
      rootIid: this.rootIid,
      inodes: [...this.inodes.values()],
    }
  }

  private persistNow() {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = undefined
    const delta = this.pendingDelta
    this.pendingDelta = createFsDelta()
    this.persistence.commit(delta)
  }

  private markDirty(delta: FsDelta) {
    this.pendingDelta = mergeFsDelta(this.pendingDelta, delta)
    if (this.saveTimer) return
    this.saveTimer = setTimeout(() => this.persistNow(), SAVE_DEBOUNCE_MS)
  }

  async flush() {
    if (this.saveTimer) this.persistNow()
    await this.persistence.flush()
  }

  private mount({ path, image, readOnly = false }: FsMount) {
    const normalizedPath = Path.normalize(path)
    if (! Path.isAbs(normalizedPath) || normalizedPath === '/') {
      throw new Error(`Invalid mount point: ${path}`)
    }

    const { dirname, filename: name } = Path.getDirAndName(normalizedPath)
    const parentResult = this.findInode(dirname, { allowedTypes: [FileT.DIR], cwd: '/' })
    const parent = this.unwrap(parentResult, `Cannot mount '${normalizedPath}'`).inode
    const fs = new Fs(image, {
      persistence: new MemoryFsPersistence(),
      readOnly,
    })
    const mounted: MountedFs = { path: normalizedPath, image, readOnly, fs, name, parent }
    this.mounts.push(mounted)
    this.mounts.sort((left, right) => right.path.length - left.path.length)
    this.attachMount(mounted)
  }

  private attachMount(mount: MountedFs) {
    const { dirname } = Path.getDirAndName(mount.path)
    mount.parent = this.findInodeU(dirname, { allowedTypes: [FileT.DIR], cwd: '/' }).inode
    const children = this.mountsByParent.get(mount.parent.file) ?? new Map()
    children.set(mount.name, mount)
    this.mountsByParent.set(mount.parent.file, children)
  }

  private freezeFiles() {
    this.inodes.forEach((inode) => {
      const { file, executable, metadata } = inode
      if (file.type === FileT.DIR) Object.freeze(file.entries)
      Object.freeze(file)
      if (executable) Object.freeze(executable)
      Object.freeze(metadata)
      Object.freeze(inode)
    })
  }

  private absolutePath(path: string, cwd = this.cwd) {
    return Path.resolve(path, cwd)
  }

  private resolveMountedPath(path: string, cwd = this.cwd) {
    const absolute = this.absolutePath(path, cwd)
    const mount = this.mounts.find(({ path: mountPath }) => (
      absolute === mountPath || absolute.startsWith(`${mountPath}/`)
    ))
    const mountedPath = mount
      ? absolute.slice(mount.path.length) || '/'
      : absolute
    return { absolute, mount, mountedPath }
  }

  private readOnlyError<T>(): FOp.OperationResult<T> {
    return FOp.err({ type: FOp.T.READ_ONLY_FILE_SYSTEM })
  }

  get cwd() {
    return this.getCwd()
  }

  isFileOfType<FT extends FileT>(file: File, types: readonly FT[]): file is FileFromT<FT> {
    return types.some(type => type === file.type)
  }

  isInodeOfType<FT extends FileT>(inode: Inode, types: readonly FT[]): inode is Inode<FileFromT<FT>> {
    return this.isFileOfType(inode.file, types)
  }

  create<FB extends Vfs.Vfile>(tree: FB): FOp.CreateResult<FileFromT<FB['type']>> {
    if (this.isReadOnly) return this.readOnlyError()
    const result = this.createUnchecked(tree)
    if (result.isOk) this.markDirty(createPutsDelta(result.val.createdInodes))
    return result
  }

  private createUnchecked<FB extends Vfs.Vfile>(tree: FB): FOp.CreateResult<FileFromT<FB['type']>> {
    const result = Vfs.create(this, tree, this.now())
    if (result.isOk) {
      result.val.createdInodes.forEach((inode) => {
        FILE_SYSTEM_OWNER.set(inode.file, this)
      })
    }
    return result
  }

  createAt<FB extends Vfs.Vfile>(parent: Inode<DirFile>, name: string, tree: FB): FOp.CreateResult<FileFromT<FB['type']>> {
    const owner = FILE_SYSTEM_OWNER.get(parent.file)
    if (owner && owner !== this) return owner.createAt(parent, name, tree)
    if (this.isReadOnly) return this.readOnlyError()
    if (this.getChildInode(parent.file, name)) return FOp.err({ type: FOp.T.ALREADY_EXISTS })
    const createRes = this.createUnchecked(tree)
    if (createRes.isErr) return createRes

    parent.file.entries[name] = createRes.val.inode.iid
    parent.metadata.modifiedAt = this.now()
    this.markDirty(createPutsDelta([
      parent,
      ...createRes.val.createdInodes,
    ]))
    return createRes
  }

  unwrap<T>(res: FOp.OperationResult<T>, errHead: string): T {
    return res.unwrapBy((error) => {
      throw new UserError(`${errHead}: ${FOp.displayError(error)}`)
    })
  }

  findInode<FT extends FileT = FileT>(
    path: string,
    { allowedTypes, cwd = this.cwd }: FOp.FindOptions<FT> = {},
  ): FOp.FindInodeResult<FileFromT<FT>> {
    const { absolute, mount, mountedPath } = this.resolveMountedPath(path, cwd)
    if (mount) {
      const result = mount.fs.findInode(mountedPath, { allowedTypes, cwd: '/' })
      if (result.isErr) return result
      if (Path.hasTrailingSlash(path) && result.val.inode.file.type !== FileT.DIR) {
        return FOp.err({ type: FOp.T.NOT_DIR })
      }
      return FOp.ok({
        ...result.val,
        path: absolute,
        filename: absolute === mount.path ? mount.name : result.val.filename,
        parentInode: absolute === mount.path ? mount.parent : result.val.parentInode,
      })
    }
    const parts = Path.split(absolute)

    const inodeStack: Inode[] = [this.root]
    const partStack = ['']

    for (const part of parts) {
      const currentInode = inodeStack.at(- 1)
      if (! currentInode) return FOp.err({ type: FOp.T.DANGLING_INODE })
      const { file } = currentInode
      if (file.type !== FileT.DIR) return FOp.err({ type: FOp.T.NOT_DIR })
      if (part === '.') continue
      if (part === '..') {
        if (inodeStack.length > 1) {
          inodeStack.pop()
          partStack.pop()
        }
        continue
      }
      if (! (part in file.entries)) return FOp.err({ type: FOp.T.NOT_FOUND })
      const inode = this.inodes.get(file.entries[part])
      if (! inode) return FOp.err({ type: FOp.T.NOT_FOUND })
      inodeStack.push(inode)
      partStack.push(part)
    }

    const inode = inodeStack.pop()
    if (! inode) return FOp.err({ type: FOp.T.DANGLING_INODE })
    if (Path.hasTrailingSlash(path) && inode.file.type !== FileT.DIR) {
      return FOp.err({ type: FOp.T.NOT_DIR })
    }
    if (allowedTypes && ! this.isInodeOfType(inode, allowedTypes)) {
      return FOp.err({ type: FOp.T.NOT_ALLOWED_TYPE, allowedTypes })
    }

    return FOp.ok({
      inode: inode as Inode<FileFromT<FT>>,
      path: partStack.join('/') || '/',
      filename: partStack.at(- 1) ?? '',
      parentInode: inodeStack.at(- 1) as Inode<DirFile> ?? this.root,
    })
  }

  findInodeU<FT extends FileT = FileT>(path: string, options: FOp.FindOptions<FT> = {}) {
    return this.unwrap(this.findInode(path, options), path)
  }

  find<FT extends FileT = FileT>(
    path: string,
    { allowedTypes, cwd }: FOp.FindOptions<FT> = {},
  ): FOp.FindResult<FileFromT<FT>> {
    const res = this.findInode(path, { allowedTypes, cwd })
    if (res.isErr) return res
    return FOp.ok({
      file: res.val.inode.file,
      filename: res.val.filename,
      path: res.val.path,
      parent: res.val.parentInode.file,
    })
  }

  findU<FT extends FileT = FileT>(path: string, options: FOp.FindOptions<FT> = {}) {
    return this.unwrap(this.find(path, options), path)
  }

  stat(path: string, cwd = this.cwd): FOp.StatResult {
    const result = this.findInode(path, { cwd })
    if (result.isErr) return result
    const { inode } = result.val
    return FOp.ok({
      iid: inode.iid,
      type: inode.file.type,
      size: inode.file.type === FileT.NORMAL
        ? new TextEncoder().encode(inode.file.content).byteLength
        : 0,
      createdAt: inode.metadata.createdAt,
      modifiedAt: inode.metadata.modifiedAt,
      executable: inode.executable !== undefined,
    })
  }

  statU(path: string, cwd = this.cwd) {
    return this.unwrap(this.stat(path, cwd), path)
  }

  getChild(dir: DirFile, childName: string) {
    return this.getChildInode(dir, childName)?.file ?? null
  }

  getChildInode(dir: DirFile, childName: string): Inode | null {
    const mounted = this.mountsByParent.get(dir)?.get(childName)
    if (mounted) return mounted.fs.root
    const owner = FILE_SYSTEM_OWNER.get(dir)
    if (owner && owner !== this) return owner.getChildInode(dir, childName)
    if (! (childName in dir.entries)) return null
    return this.inodes.get(dir.entries[childName]) ?? null
  }

  getChildren(dir: DirFile): FsChild[] {
    const owner = FILE_SYSTEM_OWNER.get(dir)
    const children: FsChild[] = owner && owner !== this
      ? owner.getChildren(dir)
      : Object
          .entries(dir.entries)
          .map(([name, iid]) => {
            const inode = this.inodes.get(iid)
            return { name, iid, inode, file: inode?.file ?? null }
          })
    const mounted = this.mountsByParent.get(dir)
    if (! mounted) return children
    const mountedNames = new Set(mounted.keys())
    return [
      ...children.filter(({ name }) => ! mountedNames.has(name)),
      ...[...mounted].map(([name, { fs }]) => ({
        name,
        iid: fs.root.iid,
        inode: fs.root,
        file: fs.root.file,
      })),
    ]
  }

  isEmptyDir(dir: DirFile) {
    return ! this.getChildren(dir).length
  }

  mkdir(path: string, { parents = false }: { parents?: boolean } = {}): FOp.MkdirResult {
    const { mount, mountedPath } = this.resolveMountedPath(path)
    if (mount) return mount.fs.mkdir(mountedPath, { parents })
    if (this.isReadOnly) return this.readOnlyError()

    if (parents) {
      const existing = this.findInode(path, { allowedTypes: [FileT.DIR] })
      if (existing.isOk) return FOp.ok({ dir: existing.val.inode.file })
      if (existing.err.type === FOp.T.NOT_ALLOWED_TYPE) return existing
    }

    const { dirname, filename } = Path.getDirAndName(path)
    if (! Path.isLegalFilename(filename)) return FOp.err({ type: FOp.T.ILLEGAL_NAME })

    let dirRes = this.findInode(dirname, { allowedTypes: [FileT.DIR] })
    if (parents && dirRes.isErr && dirRes.err.type === FOp.T.NOT_FOUND) {
      const parentResult = this.mkdir(dirname, { parents: true })
      if (parentResult.isErr) return parentResult
      dirRes = this.findInode(dirname, { allowedTypes: [FileT.DIR] })
    }
    if (dirRes.isErr) return dirRes
    const { inode: parentInode } = dirRes.val
    if (this.getChildInode(parentInode.file, filename)) return FOp.err({ type: FOp.T.ALREADY_EXISTS })

    const createRes = this.createAt(parentInode, filename, Vfs.dir())
    if (createRes.isErr) return createRes

    const { inode } = createRes.val
    return FOp.ok({
      dir: inode.file,
    })
  }

  mkdirU(path: string, options: { parents?: boolean } = {}) {
    return this.unwrap(this.mkdir(path, options), `Cannot create directory '${path}'`)
  }

  rmWhere(parentInode: Inode<DirFile>, filename: string): FOp.OperationResult<void> {
    const mounted = this.mountsByParent.get(parentInode.file)?.get(filename)
    if (mounted) return mounted.fs.isReadOnly
      ? this.readOnlyError()
      : FOp.err({ type: FOp.T.IS_ROOT })
    const owner = FILE_SYSTEM_OWNER.get(parentInode.file)
    if (owner && owner !== this) return owner.rmWhere(parentInode, filename)
    if (this.isReadOnly) return this.readOnlyError()
    const inode = this.getChildInode(parentInode.file, filename)
    if (! inode) return FOp.err({ type: FOp.T.NOT_FOUND })
    const { file, iid } = inode

    if (file.type === FileT.DIR) {
      if (! this.isEmptyDir(file)) {
        return FOp.err({ type: FOp.T.IS_A_DIR })
      }
    }

    this.inodes.delete(iid)
    this.inodeBitmap.set(iid, 0)
    delete parentInode.file.entries[filename]
    parentInode.metadata.modifiedAt = this.now()

    this.markDirty(mergeFsDelta(
      createDeleteDelta(iid),
      createPutDelta(parentInode),
    ))

    return FOp.ok(undefined)
  }

  rm(path: string): FOp.RmResult {
    const { mount, mountedPath } = this.resolveMountedPath(path)
    if (mount) return mount.fs.rm(mountedPath)
    if (this.isReadOnly) return this.readOnlyError()
    const res = this.findInode(path)
    if (res.isErr) return res

    const { inode, parentInode: parent, filename } = res.val
    if (inode === this.root) return FOp.err({ type: FOp.T.IS_ROOT })

    const rmRes = this.rmWhere(parent, filename)
    if (rmRes.isErr) return rmRes

    return FOp.ok({
      path: Path.normalize(path),
    })
  }

  rmU(path: string) {
    return this.unwrap(this.rm(path), `Cannot remove '${path}'`)
  }

  private markInodeDirty = (inode: Inode) => {
    if (this.inodes.get(inode.iid) !== inode) return
    inode.metadata.modifiedAt = this.now()
    this.markDirty(createPutDelta(inode))
  }

  private createFileHandle<FM extends FileMode>(inode: Inode<NormalFile>, mode: FM): FileHandleFromMode<FM> {
    const Handle = FILE_HANDLE_FROM_MODE[mode]
    return new Handle(this.markInodeDirty, inode) as FileHandleFromMode<FM>
  }

  open<FM extends FileMode>(path: string, mode: FM, cwd = this.cwd): FOp.OpenResult<FM> {
    const { mount, mountedPath } = this.resolveMountedPath(path, cwd)
    if (mount) return mount.fs.open(mountedPath, mode)
    if (this.isReadOnly && mode !== 'r') return this.readOnlyError()
    const res = this.findInode(path, { allowedTypes: [FileT.NORMAL], cwd })

    let inode: Inode<NormalFile>
    if (res.isErr) {
      if (mode === 'r' || res.err.type === FOp.T.NOT_ALLOWED_TYPE) return res
      const { dirname, filename } = Path.getDirAndName(path)

      if (! filename) return FOp.err({ type: FOp.T.ILLEGAL_NAME })

      const dirRes = this.findInode(dirname, { allowedTypes: [FileT.DIR], cwd })
      if (dirRes.isErr) return dirRes

      const { inode: parentInode } = dirRes.val
      const createRes = this.createAt(parentInode, filename, Vfs.normal(''))
      if (createRes.isErr) return createRes
      inode = createRes.val.inode as Inode<NormalFile>
    }
    else {
      inode = res.val.inode
    }

    if (mode === 'w' || mode === 'rw') {
      inode.file.content = ''
      this.markInodeDirty(inode)
    }

    return FOp.ok({
      handle: this.createFileHandle(inode, mode),
    })
  }

  openU<FM extends FileMode>(path: string, mode: FM, cwd = this.cwd) {
    return this.unwrap(this.open(path, mode, cwd), path)
  }
}
