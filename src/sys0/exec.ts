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
import { parseShebang } from './shebang'

export type NativeProgramRegistry = Record<string, Program>
const MAX_INTERPRETER_DEPTH = 16

export const enum ExecErrorT {
  NOT_FOUND,
  NOT_EXECUTABLE,
  NATIVE_PROGRAM_NOT_REGISTERED,
  FILE_SYSTEM_ERROR,
  INTERPRETER_ERROR,
  INTERPRETER_LOOP,
}

export type ExecError =
  | { type: ExecErrorT.NOT_FOUND }
  | { type: ExecErrorT.NOT_EXECUTABLE, path: string }
  | { type: ExecErrorT.NATIVE_PROGRAM_NOT_REGISTERED, programId: string }
  | { type: ExecErrorT.FILE_SYSTEM_ERROR, error: FOp.Error }
  | {
    type: ExecErrorT.INTERPRETER_ERROR
    path: string
    interpreterPath: string
    error: ExecError
  }
  | { type: ExecErrorT.INTERPRETER_LOOP, path: string }

const displayExecErrorCause = (error: ExecError): string => {
  switch (error.type) {
    case ExecErrorT.NOT_FOUND:
      return 'No such file or directory'
    case ExecErrorT.NOT_EXECUTABLE:
      return `${error.path}: not executable`
    case ExecErrorT.NATIVE_PROGRAM_NOT_REGISTERED:
      return `Native program '${error.programId}' is not registered`
    case ExecErrorT.FILE_SYSTEM_ERROR:
      return FOp.displayError(error.error)
    case ExecErrorT.INTERPRETER_ERROR:
    case ExecErrorT.INTERPRETER_LOOP:
      return displayInterpreterError(error)
  }
}

export const displayInterpreterError = (
  error: Extract<ExecError, { type: ExecErrorT.INTERPRETER_ERROR | ExecErrorT.INTERPRETER_LOOP }>,
): string => error.type === ExecErrorT.INTERPRETER_LOOP
  ? `${error.path}: bad interpreter: interpreter loop`
  : `${error.path}: bad interpreter: ${error.interpreterPath}: ${displayExecErrorCause(error.error)}`

export interface ResolvedExecutable {
  path: string
  inode: Inode<NormalFile>
  descriptor: SysExecutable
  program: Program
  argvPrefix: string[]
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

  private resolvePath(
    candidate: string,
    cwd: string,
    fs: FsSession,
    visited: ReadonlySet<string>,
  ): Result<ResolvedExecutable, ExecError> {
    const found = fs.findInode(candidate, { cwd })
    if (found.isErr) {
      return found.err.type === FOp.T.NOT_FOUND
        ? Err({ type: ExecErrorT.NOT_FOUND })
        : Err({ type: ExecErrorT.FILE_SYSTEM_ERROR, error: found.err })
    }

    const { inode, path } = found.val
    if (inode.file.type !== FileT.NORMAL) {
      return Err({ type: ExecErrorT.NOT_EXECUTABLE, path })
    }
    const normalInode = inode as Inode<NormalFile>
    if (! hasExecuteBit(normalInode) || ! fs.canAccess(normalInode, AccessMode.EXECUTE)) {
      return Err({ type: ExecErrorT.NOT_EXECUTABLE, path })
    }

    const descriptor = loadSysExecutable(normalInode)
    if (descriptor) {
      const program = this.nativePrograms[descriptor.programId]
      if (! program) {
        return Err({
          type: ExecErrorT.NATIVE_PROGRAM_NOT_REGISTERED,
          programId: descriptor.programId,
        })
      }
      return Ok({ path, inode: normalInode, descriptor, program, argvPrefix: [] })
    }

    const shebang = parseShebang(normalInode.file.content)
    if (shebang.isErr || ! shebang.val) {
      return Err({ type: ExecErrorT.NOT_EXECUTABLE, path })
    }
    if (visited.has(path) || visited.size >= MAX_INTERPRETER_DEPTH) {
      return Err({ type: ExecErrorT.INTERPRETER_LOOP, path })
    }
    const nextVisited = new Set(visited).add(path)
    const interpreter = this.resolvePath(shebang.val.interpreterPath, '/', fs, nextVisited)
    if (interpreter.isErr) {
      return interpreter.err.type === ExecErrorT.INTERPRETER_LOOP
        ? interpreter
        : Err({
            type: ExecErrorT.INTERPRETER_ERROR,
            path,
            interpreterPath: shebang.val.interpreterPath,
            error: interpreter.err,
          })
    }
    return Ok({
      ...interpreter.val,
      path,
      argvPrefix: [
        ...interpreter.val.argvPrefix,
        ...(shebang.val.argument ? [shebang.val.argument] : []),
        path,
      ],
    })
  }

  resolve(
    command: string,
    { envPath, cwd, fs }: ResolveExecutableOptions,
  ): Result<ResolvedExecutable, ExecError> {
    const candidates = Path.hasSlash(command)
      ? [command]
      : envPath.split(':').filter(Boolean).map(path => `${path}/${command}`)
    let nonExecutablePath: string | undefined

    for (const candidate of candidates) {
      const resolved = this.resolvePath(candidate, cwd, fs, new Set())
      if (resolved.isOk) return resolved
      if (resolved.err.type === ExecErrorT.NOT_FOUND) continue
      if (resolved.err.type === ExecErrorT.NOT_EXECUTABLE) {
        nonExecutablePath ??= resolved.err.path
        continue
      }
      return resolved
    }

    return nonExecutablePath
      ? Err({ type: ExecErrorT.NOT_EXECUTABLE, path: nonExecutablePath })
      : Err({ type: ExecErrorT.NOT_FOUND })
  }

  isExecutable(inode: Inode): inode is Inode<NormalFile> {
    if (inode.file.type !== FileT.NORMAL) return false
    const normalInode = inode as Inode<NormalFile>
    if (! hasExecuteBit(normalInode)) return false
    if (loadSysExecutable(normalInode)) return true
    const shebang = parseShebang(normalInode.file.content)
    return shebang.isOk && shebang.val !== undefined
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
