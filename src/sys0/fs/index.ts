import { Bitmap } from '@/utils/bitmap'
import { Awaitable, Pred, StrictOmit } from '@/utils/types'
import { Err, Ok, Result } from 'fk-result'
import { UserError } from '@/utils/errors'

import { FileMode, FileHandleFromMode, FILE_HANDLE_FROM_MODE } from './file_handle'
import { FsPersistence, LocalStorageFsPersistence } from './persistence'
import { Vfs } from './vfs'
import { Path } from './path'

export const enum FileT {
  DIR,
  NORMAL,
  JSEXE,
}

export const FileTNames: Record<FileT, string> = {
  [FileT.DIR]: 'directory',
  [FileT.NORMAL]: 'normal file',
  [FileT.JSEXE]: 'JS executable',
}

export const displayFileT = (type: FileT) => {
  return FileTNames[type]
}

export type InodeId = number
export interface Inode<F extends File = File> {
  iid: InodeId
  file: F
}
export type Inodes = Map<InodeId, Inode>

export type File =
  | DirFile
  | NormalFile
  | JsExeFile

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

export interface NormalFile {
  type: FileT.NORMAL
  content: string
}

export interface JsExeFile {
  type: FileT.JSEXE
  programName: string
}

export type FileFromT<FT extends FileT> =
  FT extends FileT.DIR ? DirFile :
    FT extends FileT.NORMAL ? NormalFile :
      FT extends FileT.JSEXE ? JsExeFile :
        never

export interface FReadKeyOptions {
  signal?: AbortSignal
}

export interface FRead {
  readKey(options?: FReadKeyOptions): Awaitable<string>
  read(): Awaitable<string>
  readUntil(pred: Pred<string>): Awaitable<string>
  readLn(): Awaitable<string>
}

export interface FWrite {
  write(data: string): void
  writeLn(data: string): void
}

export interface FReadWrite extends FRead, FWrite {}

export const MAX_INODE_COUNT = 1024

export interface InodeMaintainer {
  inodes: Inodes
  inodeBitmap: Bitmap
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
  export type CreateResult<F extends File = File> = OperationResult<{ inode: Inode<F> }>

  export type RmResult = OperationResult<{ path: string }>

  export interface FindOptions<FT extends FileT = FileT> {
    allowedTypes?: readonly FT[]
    cwd?: string
  }
}

export interface FsMigration {
  version: number
  migrate(fs: Fs): FOp.OperationResult<void>
}

export class Fs {
  inodes: Inodes = new Map()
  inodeBitmap: Bitmap = new Bitmap(MAX_INODE_COUNT)
  rootIid = 1
  get root() {
    const root = this.inodes.get(this.rootIid)
    if (! root) throw new Error('File system root inode is missing')
    return root
  }

  readonly persistence: FsPersistence
  private readonly getCwd: () => string
  private readonly migrations: readonly FsMigration[]

  constructor(
    private readonly initialImage: Vfs.DirVfile,
    {
      persistence = new LocalStorageFsPersistence(),
      getCwd = () => '/',
      migrations = [],
    }: {
      persistence?: FsPersistence
      getCwd?: () => string
      migrations?: readonly FsMigration[]
    } = {},
  ) {
    this.persistence = persistence
    this.getCwd = getCwd
    this.migrations = [...migrations].sort((left, right) => left.version - right.version)
    this.load()
  }

  reset() {
    this.persistence.clear()
    this.inodes.clear()
    this.inodeBitmap.clear()
    this.load()
  }

  load() {
    if (! this.persistence.isInitialized) {
      this.create(this.initialImage)
      this.inodes.forEach((inode, iid) => {
        this.persistence.set(iid, inode)
      })
      this.persistence.isInitialized = true
      this.persistence.schemaVersion = this.migrations.at(- 1)?.version ?? 0
    }
    else {
      this.persistence.getAll().forEach(([iid, inode]) => {
        this.inodes.set(iid, inode)
        this.inodeBitmap.set(iid, 1)
      })
      this.runMigrations()
    }
  }

  private runMigrations() {
    for (const migration of this.migrations) {
      if (migration.version <= this.persistence.schemaVersion) continue
      this.unwrap(migration.migrate(this), `File system migration ${migration.version} failed`)
      this.persistence.schemaVersion = migration.version
    }
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
    const existingIids = new Set(this.inodes.keys())
    const result = Vfs.create(this, tree)
    if (result.isOk) {
      this.inodes.forEach((inode, iid) => {
        if (! existingIids.has(iid)) this.persistence.set(iid, inode)
      })
    }
    return result
  }

  createAt<FB extends Vfs.Vfile>(parent: Inode<DirFile>, name: string, tree: FB): FOp.CreateResult<FileFromT<FB['type']>> {
    const createRes = this.create(tree)
    if (createRes.isErr) return createRes

    parent.file.entries[name] = createRes.val.inode.iid
    this.persistence.set(parent.iid, parent)
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
    let path1 = path
    if (! Path.isAbsOrRel(path1)) path1 = `./${path1}`
    const parts = Path.split(path1)

    if (parts[0] === '.' || parts[0] === '..') {
      parts.unshift(...Path.split(cwd))
    }
    if (! parts[0]) parts.shift()

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
    { allowedTypes }: FOp.FindOptions<FT> = {},
  ): FOp.FindResult<FileFromT<FT>> {
    const res = this.findInode(path, { allowedTypes })
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

  getChild(dir: DirFile, childName: string) {
    return this.getChildInode(dir, childName)?.file ?? null
  }

  getChildInode(dir: DirFile, childName: string) {
    if (! (childName in dir.entries)) return null
    return this.inodes.get(dir.entries[childName])
  }

  getChildren(dir: DirFile) {
    return Object
      .entries(dir.entries)
      .map(([name, iid]) => {
        const inode = this.inodes.get(iid)
        return { name, iid, inode, file: inode?.file ?? null }
      })
  }

  isEmptyDir(dir: DirFile) {
    return ! Object.keys(dir.entries).length
  }

  findInEnvPath(
    path: string,
    envPath: string,
    options?: StrictOmit<FOp.FindOptions, 'allowedTypes'>,
  ): FOp.FindResult<JsExeFile> {
    if (Path.hasSlash(path)) return this.find(path, { ...options, allowedTypes: [FileT.JSEXE] })

    const envPathList = envPath.split(':').filter(Boolean)
    for (const envPath of envPathList) {
      const entry = this.find(`${envPath}/${path}`, { ...options, allowedTypes: [FileT.JSEXE] })
      if (entry.isOk) return entry
    }
    return FOp.err({ type: FOp.T.NOT_FOUND })
  }

  mkdir(path: string): FOp.MkdirResult {
    const { dirname, filename } = Path.getDirAndName(path)
    if (! Path.isLegalFilename(filename)) return FOp.err({ type: FOp.T.ILLEGAL_NAME })

    const dirRes = this.findInode(dirname, { allowedTypes: [FileT.DIR] })
    if (dirRes.isErr) return dirRes
    const { inode: parentInode } = dirRes.val
    if (parentInode.file.entries[filename]) return FOp.err({ type: FOp.T.ALREADY_EXISTS })

    const createRes = this.createAt(parentInode, filename, Vfs.dir())
    if (createRes.isErr) return createRes

    const { inode } = createRes.val
    return FOp.ok({
      dir: inode.file,
    })
  }

  mkdirU(path: string) {
    return this.unwrap(this.mkdir(path), `Cannot create directory '${path}'`)
  }

  rmWhere(parentInode: Inode<DirFile>, filename: string): FOp.OperationResult<void> {
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

    this.persistence.delete(iid)
    this.persistence.set(parentInode.iid, parentInode)

    return FOp.ok(undefined)
  }

  rm(path: string): FOp.RmResult {
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

  private createFileHandle<FM extends FileMode>(inode: Inode<NormalFile>, mode: FM): FileHandleFromMode<FM> {
    const Handle = FILE_HANDLE_FROM_MODE[mode]
    return new Handle(this.persistence, inode) as FileHandleFromMode<FM>
  }

  open<FM extends FileMode>(path: string, mode: FM): FOp.OpenResult<FM> {
    const res = this.findInode(path, { allowedTypes: [FileT.NORMAL] })

    let inode: Inode<NormalFile>
    if (res.isErr) {
      if (mode === 'r' || res.err.type === FOp.T.NOT_ALLOWED_TYPE) return res
      const { dirname, filename } = Path.getDirAndName(path)

      if (! filename) return FOp.err({ type: FOp.T.ILLEGAL_NAME })

      const dirRes = this.findInode(dirname, { allowedTypes: [FileT.DIR] })
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
      this.persistence.set(inode.iid, inode)
    }

    return FOp.ok({
      handle: this.createFileHandle(inode, mode),
    })
  }

  openU<FM extends FileMode>(path: string, mode: FM) {
    return this.unwrap(this.open(path, mode), path)
  }
}
