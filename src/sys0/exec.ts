import { Err, Ok, Result } from 'fk-result'
import {
  FileT,
  FOp,
  Inode,
  NormalFile,
} from './fs'
import { Path } from './fs/path'
import type { FsSession } from './fs/session'
import { AccessMode, PermissionBits } from './fs/permissions'
import { hasExecuteBit, loadSysExecutable, type SysExecutable } from './executable'
import { createExecCredentials, type ProcessCredentials } from './identity'
import { Program } from './program'

export type NativeProgramRegistry = Record<string, Program>

export const enum ExecErrorT {
  NOT_FOUND,
  NOT_EXECUTABLE,
  NATIVE_PROGRAM_NOT_REGISTERED,
  FILE_SYSTEM_ERROR,
}

export type ExecError =
  | { type: ExecErrorT.NOT_FOUND }
  | { type: ExecErrorT.NOT_EXECUTABLE, path: string }
  | { type: ExecErrorT.NATIVE_PROGRAM_NOT_REGISTERED, programId: string }
  | { type: ExecErrorT.FILE_SYSTEM_ERROR, error: FOp.Error }

export interface ResolvedExecutable {
  path: string
  inode: Inode<NormalFile>
  descriptor: SysExecutable
  program: Program
}

export interface ResolveExecutableOptions {
  envPath: string
  cwd: string
  fs: FsSession
}

export const credentialsForExecutable = (inode: Inode, parent: ProcessCredentials) => (
  createExecCredentials(parent, {
    uid: inode.metadata.uid,
    gid: inode.metadata.gid,
    setUid: (inode.metadata.mode & PermissionBits.SET_UID) !== 0,
    setGid: (inode.metadata.mode & PermissionBits.SET_GID) !== 0,
  })
)

export class ExecService {
  constructor(private readonly nativePrograms: NativeProgramRegistry) {}

  resolve(
    command: string,
    { envPath, cwd, fs }: ResolveExecutableOptions,
  ): Result<ResolvedExecutable, ExecError> {
    const candidates = Path.hasSlash(command)
      ? [command]
      : envPath.split(':').filter(Boolean).map(path => `${path}/${command}`)
    let nonExecutablePath: string | undefined

    for (const candidate of candidates) {
      const found = fs.findInode(candidate, { cwd })
      if (found.isErr) {
        if (found.err.type === FOp.T.NOT_FOUND) continue
        return Err({ type: ExecErrorT.FILE_SYSTEM_ERROR, error: found.err })
      }

      const { inode, path } = found.val
      if (inode.file.type !== FileT.NORMAL) {
        nonExecutablePath ??= path
        continue
      }
      const normalInode = inode as Inode<NormalFile>
      const descriptor = loadSysExecutable(normalInode)
      if (! descriptor
        || ! hasExecuteBit(normalInode)
        || ! fs.canAccess(normalInode, AccessMode.EXECUTE)) {
        nonExecutablePath ??= path
        continue
      }
      const program = this.nativePrograms[descriptor.programId]
      if (! program) {
        return Err({
          type: ExecErrorT.NATIVE_PROGRAM_NOT_REGISTERED,
          programId: descriptor.programId,
        })
      }
      return Ok({ path, inode: normalInode, descriptor, program })
    }

    return nonExecutablePath
      ? Err({ type: ExecErrorT.NOT_EXECUTABLE, path: nonExecutablePath })
      : Err({ type: ExecErrorT.NOT_FOUND })
  }

  isExecutable(inode: Inode): inode is Inode<NormalFile> {
    if (inode.file.type !== FileT.NORMAL) return false
    const normalInode = inode as Inode<NormalFile>
    return hasExecuteBit(normalInode) && loadSysExecutable(normalInode) !== undefined
  }

  listInPath(envPath: string, cwd: string, fs: FsSession): string[] {
    const names = new Set<string>()
    for (const path of envPath.split(':').filter(Boolean)) {
      const directory = fs.find(path, { allowedTypes: [FileT.DIR], cwd })
      if (directory.isErr) continue
      fs.getChildren(directory.val.file).forEach(({ name, inode }) => {
        if (
          inode
          && this.isExecutable(inode)
          && fs.canAccess(inode, AccessMode.EXECUTE)
        ) names.add(name)
      })
    }
    return [...names]
  }
}
