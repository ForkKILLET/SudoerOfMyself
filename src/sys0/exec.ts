import { Err, Ok, Result } from 'fk-result'
import {
  FileT,
  FOp,
  Fs,
  Inode,
  NativeExecutableDescriptor,
  NormalFile,
} from './fs'
import { Path } from './fs/path'
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
  inode: Inode<NormalFile> & { executable: NativeExecutableDescriptor }
  program: Program
}

export interface ResolveExecutableOptions {
  envPath: string
  cwd: string
}

export class ExecService {
  constructor(
    private readonly fs: Fs,
    private readonly nativePrograms: NativeProgramRegistry,
  ) {}

  resolve(
    command: string,
    { envPath, cwd }: ResolveExecutableOptions,
  ): Result<ResolvedExecutable, ExecError> {
    const candidates = Path.hasSlash(command)
      ? [command]
      : envPath.split(':').filter(Boolean).map(path => `${path}/${command}`)
    let nonExecutablePath: string | undefined

    for (const candidate of candidates) {
      const found = this.fs.findInode(candidate, { cwd })
      if (found.isErr) {
        if (found.err.type === FOp.T.NOT_FOUND) continue
        return Err({ type: ExecErrorT.FILE_SYSTEM_ERROR, error: found.err })
      }

      const { inode, path } = found.val
      if (! this.isExecutable(inode)) {
        nonExecutablePath ??= path
        continue
      }
      const program = this.nativePrograms[inode.executable.programId]
      if (! program) {
        return Err({
          type: ExecErrorT.NATIVE_PROGRAM_NOT_REGISTERED,
          programId: inode.executable.programId,
        })
      }
      return Ok({ path, inode, program })
    }

    return nonExecutablePath
      ? Err({ type: ExecErrorT.NOT_EXECUTABLE, path: nonExecutablePath })
      : Err({ type: ExecErrorT.NOT_FOUND })
  }

  isExecutable(inode: Inode): inode is Inode<NormalFile> & { executable: NativeExecutableDescriptor } {
    return inode.file.type === FileT.NORMAL && inode.executable?.format === 'native'
  }

  listInPath(envPath: string, cwd: string): string[] {
    const names = new Set<string>()
    for (const path of envPath.split(':').filter(Boolean)) {
      const directory = this.fs.find(path, { allowedTypes: [FileT.DIR], cwd })
      if (directory.isErr) continue
      this.fs.getChildren(directory.val.file).forEach(({ name, inode }) => {
        if (inode && this.isExecutable(inode)) names.add(name)
      })
    }
    return [...names]
  }
}
