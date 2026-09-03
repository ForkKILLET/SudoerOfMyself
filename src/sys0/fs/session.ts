import type { ProcessCredentials } from '../identity'
import { FileT, FOp, type DirFile, type File, type Fs, type Inode } from '.'
import type { FileMode } from './file_handle'
import { Path } from './path'
import { AccessMode, hasPermission, normalizeMode, PermissionBits } from './permissions'
import { Vfs } from './vfs'
import type { UnixMode } from './permissions'

export class FsSession {
  constructor(
    readonly fs: Fs,
    private readonly getCwd: () => string,
    private readonly getCredentials: () => ProcessCredentials,
    private readonly getUmask: () => UnixMode,
  ) {}

  get cwd() {
    return this.getCwd()
  }

  get credentials() {
    return this.getCredentials()
  }

  get umask() {
    return this.getUmask()
  }

  private get creation(): Vfs.CreationContext {
    return {
      uid: this.credentials.effectiveUid,
      gid: this.credentials.effectiveGid,
      umask: this.umask,
    }
  }

  private creationIn(parent: Inode<DirFile>): Vfs.CreationContext {
    return {
      ...this.creation,
      gid: (parent.metadata.mode & PermissionBits.SET_GID) !== 0
        ? parent.metadata.gid
        : this.credentials.effectiveGid,
    }
  }

  private denied<T>(): FOp.OperationResult<T> {
    return FOp.err({ type: FOp.T.PERMISSION_DENIED })
  }

  canAccess(inode: Inode, access: AccessMode) {
    return hasPermission({
      ...inode.metadata,
      isDirectory: inode.file.type === FileT.DIR,
    }, this.credentials, access)
  }

  private checkTraversal(path: string, cwd: string): FOp.OperationResult<void> {
    const absolute = Path.resolve(path, cwd)
    const { dirname } = Path.getDirAndName(absolute)
    const directories = ['/', ...Path.split(dirname).map((_, index, parts) => (
      `/${parts.slice(0, index + 1).join('/')}`
    ))]

    for (const directory of directories) {
      const result = this.fs.findInode(directory, { allowedTypes: [FileT.DIR], cwd: '/' })
      if (result.isErr) return result
      if (! this.canAccess(result.val.inode, AccessMode.EXECUTE)) return this.denied()
    }
    return FOp.ok(undefined)
  }

  private findParent(path: string, cwd: string) {
    const absolute = Path.resolve(path, cwd)
    const { dirname } = Path.getDirAndName(absolute)
    return this.findInode(dirname, { allowedTypes: [FileT.DIR], cwd: '/' })
  }

  private canRemove(parent: Inode<DirFile>, inode: Inode) {
    if (! this.canAccess(parent, AccessMode.WRITE | AccessMode.EXECUTE)) return this.denied()
    if ((parent.metadata.mode & PermissionBits.STICKY) === 0) return FOp.ok(undefined)
    const uid = this.credentials.effectiveUid
    if (uid === 0 || uid === parent.metadata.uid || uid === inode.metadata.uid) return FOp.ok(undefined)
    return this.denied<void>()
  }

  findInode<FT extends FileT = FileT>(
    path: string,
    options: FOp.FindOptions<FT> = {},
  ) {
    const traversal = this.checkTraversal(path, options.cwd ?? this.cwd)
    if (traversal.isErr) return traversal
    return this.fs.findInode(path, { ...options, cwd: options.cwd ?? this.cwd })
  }

  findInodeU<FT extends FileT = FileT>(path: string, options: FOp.FindOptions<FT> = {}) {
    return this.fs.unwrap(this.findInode(path, options), path)
  }

  find<FT extends FileT = FileT>(path: string, options: FOp.FindOptions<FT> = {}) {
    return this.fs.find(path, { ...options, cwd: options.cwd ?? this.cwd })
  }

  findU<FT extends FileT = FileT>(path: string, options: FOp.FindOptions<FT> = {}) {
    return this.fs.unwrap(this.find(path, options), path)
  }

  findDirectoryForAccess(path: string, cwd = this.cwd): FOp.FindInodeResult<DirFile> {
    const found = this.findInode(path, { allowedTypes: [FileT.DIR], cwd })
    if (found.isErr) return found
    if (! this.canAccess(found.val.inode, AccessMode.EXECUTE)) return this.denied()
    return found
  }

  findDirectoryForAccessU(path: string, cwd = this.cwd) {
    return this.fs.unwrap(this.findDirectoryForAccess(path, cwd), path)
  }

  stat(path: string, cwd = this.cwd) {
    const traversal = this.checkTraversal(path, cwd)
    if (traversal.isErr) return traversal
    return this.fs.stat(path, cwd)
  }

  statU(path: string, cwd = this.cwd) {
    return this.fs.unwrap(this.stat(path, cwd), path)
  }

  chmod(path: string, mode: UnixMode, cwd = this.cwd) {
    const found = this.findInode(path, { cwd })
    if (found.isErr) return found
    const uid = this.credentials.effectiveUid
    if (uid !== 0 && uid !== found.val.inode.metadata.uid) return this.denied()
    let normalized = normalizeMode(mode)
    if (
      uid !== 0
      && this.credentials.effectiveGid !== found.val.inode.metadata.gid
      && ! this.credentials.supplementaryGids.has(found.val.inode.metadata.gid)
    ) normalized &= ~ PermissionBits.SET_GID
    return this.fs.updateMetadata(path, { mode: normalized }, cwd)
  }

  chown(path: string, uid: number | undefined, gid?: number, cwd = this.cwd) {
    const found = this.findInode(path, { cwd })
    if (found.isErr) return found
    if (this.credentials.effectiveUid !== 0) return this.denied()
    return this.fs.updateMetadata(path, {
      ...(uid === undefined ? {} : { uid }),
      ...(gid === undefined ? {} : { gid }),
      mode: found.val.inode.metadata.mode & ~ (PermissionBits.SET_UID | PermissionBits.SET_GID),
    }, cwd)
  }

  chgrp(path: string, gid: number, cwd = this.cwd) {
    const found = this.findInode(path, { cwd })
    if (found.isErr) return found
    const uid = this.credentials.effectiveUid
    const mayUseGroup = this.credentials.effectiveGid === gid
      || this.credentials.supplementaryGids.has(gid)
    if (uid !== 0 && (uid !== found.val.inode.metadata.uid || ! mayUseGroup)) {
      return this.denied()
    }
    return this.fs.updateMetadata(path, {
      gid,
      mode: found.val.inode.metadata.mode & ~ PermissionBits.SET_GID,
    }, cwd)
  }

  touch(path: string, cwd = this.cwd): FOp.TouchResult {
    let creation = this.creation
    const found = this.findInode(path, { cwd })
    if (found.isOk) {
      const uid = this.credentials.effectiveUid
      if (
        uid !== 0
        && uid !== found.val.inode.metadata.uid
        && ! this.canAccess(found.val.inode, AccessMode.WRITE)
      ) return this.denied()
    }
    else if (found.err.type !== FOp.T.NOT_FOUND) return found
    else {
      const parent = this.findParent(path, cwd)
      if (parent.isErr) return parent
      if (! this.canAccess(parent.val.inode, AccessMode.WRITE | AccessMode.EXECUTE)) {
        return this.denied()
      }
      creation = this.creationIn(parent.val.inode)
    }
    return this.fs.touch(path, cwd, creation)
  }

  touchU(path: string, cwd = this.cwd) {
    return this.fs.unwrap(this.touch(path, cwd), `Cannot touch '${path}'`)
  }

  getChild(dir: DirFile, childName: string) {
    const inode = this.fs.getInode(dir)
    if (inode && ! this.canAccess(inode, AccessMode.EXECUTE)) {
      this.fs.unwrap(this.denied(), childName)
    }
    return this.fs.getChild(dir, childName)
  }

  getChildInode(dir: DirFile, childName: string) {
    const inode = this.fs.getInode(dir)
    if (inode && ! this.canAccess(inode, AccessMode.EXECUTE)) {
      this.fs.unwrap(this.denied(), childName)
    }
    return this.fs.getChildInode(dir, childName)
  }

  getChildren(dir: DirFile) {
    const inode = this.fs.getInode(dir)
    if (inode && ! this.canAccess(inode, AccessMode.READ | AccessMode.EXECUTE)) {
      this.fs.unwrap(this.denied(), 'Cannot read directory')
    }
    return this.fs.getChildren(dir)
  }

  isEmptyDir(dir: DirFile) {
    return this.fs.isEmptyDir(dir)
  }

  isFileOfType<FT extends FileT>(file: File, types: readonly FT[]) {
    return this.fs.isFileOfType(file, types)
  }

  isInodeOfType<FT extends FileT>(inode: Inode, types: readonly FT[]) {
    return this.fs.isInodeOfType(inode, types)
  }

  mkdir(path: string, { parents = false }: { parents?: boolean } = {}): FOp.MkdirResult {
    const existing = this.findInode(path, { allowedTypes: [FileT.DIR] })
    if (existing.isOk) {
      return parents
        ? FOp.ok({ dir: existing.val.inode.file })
        : FOp.err({ type: FOp.T.ALREADY_EXISTS })
    }
    if (existing.err.type !== FOp.T.NOT_FOUND) return existing

    const { dirname } = Path.getDirAndName(path)
    let parent = this.findInode(dirname, { allowedTypes: [FileT.DIR] })
    if (parents && parent.isErr && parent.err.type === FOp.T.NOT_FOUND) {
      const createdParent = this.mkdir(dirname, { parents: true })
      if (createdParent.isErr) return createdParent
      parent = this.findInode(dirname, { allowedTypes: [FileT.DIR] })
    }
    if (parent.isErr) return parent
    if (! this.canAccess(parent.val.inode, AccessMode.WRITE | AccessMode.EXECUTE)) {
      return this.denied()
    }
    const created = this.fs.mkdir(path, { cwd: this.cwd, creation: this.creationIn(parent.val.inode) })
    if (created.isErr || (parent.val.inode.metadata.mode & PermissionBits.SET_GID) === 0) return created
    const inode = this.fs.getInode(created.val.dir)
    if (! inode) return FOp.err({ type: FOp.T.DANGLING_INODE })
    const updated = this.fs.updateMetadata(path, {
      gid: parent.val.inode.metadata.gid,
      mode: inode.metadata.mode | PermissionBits.SET_GID,
    }, this.cwd)
    return updated.isErr ? updated : created
  }

  mkdirU(path: string, options: { parents?: boolean } = {}) {
    return this.fs.unwrap(this.mkdir(path, options), `Cannot create directory '${path}'`)
  }

  rmWhere(parentInode: Inode<DirFile>, filename: string) {
    const inode = this.fs.getChildInode(parentInode.file, filename)
    if (! inode) return FOp.err({ type: FOp.T.NOT_FOUND })
    const permission = this.canRemove(parentInode, inode)
    if (permission.isErr) return permission
    return this.fs.rmWhere(parentInode, filename)
  }

  rm(path: string, cwd = this.cwd) {
    const found = this.findInode(path, { cwd })
    if (found.isErr) return found
    const permission = this.canRemove(found.val.parentInode, found.val.inode)
    if (permission.isErr) return permission
    return this.fs.rm(path, cwd)
  }

  rmU(path: string, cwd = this.cwd) {
    return this.fs.unwrap(this.rm(path, cwd), `Cannot remove '${path}'`)
  }

  rename(sourcePath: string, targetPath: string, cwd = this.cwd): FOp.RenameResult {
    const source = this.findInode(sourcePath, { cwd })
    if (source.isErr) return source
    const sourcePermission = this.canRemove(source.val.parentInode, source.val.inode)
    if (sourcePermission.isErr) return sourcePermission

    const targetParent = this.findParent(targetPath, cwd)
    if (targetParent.isErr) return targetParent
    if (! this.canAccess(targetParent.val.inode, AccessMode.WRITE | AccessMode.EXECUTE)) {
      return this.denied()
    }

    const target = this.findInode(targetPath, { cwd })
    if (target.isOk) {
      const targetPermission = this.canRemove(target.val.parentInode, target.val.inode)
      if (targetPermission.isErr) return targetPermission
    }
    else if (target.err.type !== FOp.T.NOT_FOUND) return target
    return this.fs.rename(sourcePath, targetPath, cwd)
  }

  renameU(sourcePath: string, targetPath: string, cwd = this.cwd) {
    return this.fs.unwrap(
      this.rename(sourcePath, targetPath, cwd),
      `Cannot move '${sourcePath}' to '${targetPath}'`,
    )
  }

  open<FM extends FileMode>(path: string, mode: FM, cwd = this.cwd): FOp.OpenResult<FM> {
    let creation = this.creation
    const found = this.findInode(path, { allowedTypes: [FileT.NORMAL], cwd })
    if (found.isOk) {
      const requested = (mode.includes('r') ? AccessMode.READ : 0)
        | (mode === 'r' ? 0 : AccessMode.WRITE)
      if (! this.canAccess(found.val.inode, requested)) return this.denied()
    }
    else if (mode === 'r' || found.err.type !== FOp.T.NOT_FOUND) return found
    else {
      const parent = this.findParent(path, cwd)
      if (parent.isErr) return parent
      if (! this.canAccess(parent.val.inode, AccessMode.WRITE | AccessMode.EXECUTE)) {
        return this.denied()
      }
      creation = this.creationIn(parent.val.inode)
    }
    return this.fs.open(path, mode, cwd, creation)
  }

  openU<FM extends FileMode>(path: string, mode: FM, cwd = this.cwd) {
    return this.fs.unwrap(this.open(path, mode, cwd), path)
  }

  flush() {
    return this.fs.flush()
  }
}
