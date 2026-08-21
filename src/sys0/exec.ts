import { Err, Ok, Result } from 'fk-result'
import { FileT, FOp, Fs, JsExeFile } from './fs'
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
  file: JsExeFile
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
    const found = this.fs.findInEnvPath(command, envPath, { cwd })
    if (found.isErr) {
      if (found.err.type === FOp.T.NOT_FOUND) return Err({ type: ExecErrorT.NOT_FOUND })
      if (found.err.type === FOp.T.NOT_ALLOWED_TYPE) {
        return Err({ type: ExecErrorT.NOT_EXECUTABLE, path: command })
      }
      return Err({ type: ExecErrorT.FILE_SYSTEM_ERROR, error: found.err })
    }

    const { path, file } = found.val
    const program = this.nativePrograms[file.programName]
    if (! program) {
      return Err({
        type: ExecErrorT.NATIVE_PROGRAM_NOT_REGISTERED,
        programId: file.programName,
      })
    }
    return Ok({ path, file, program })
  }

  listInPath(envPath: string, cwd: string): string[] {
    const names = new Set<string>()
    for (const path of envPath.split(':').filter(Boolean)) {
      const directory = this.fs.find(path, { allowedTypes: [FileT.DIR], cwd })
      if (directory.isErr) continue
      this.fs.getChildren(directory.val.file).forEach(({ name, file }) => {
        if (file?.type === FileT.JSEXE) names.add(name)
      })
    }
    return [...names]
  }
}
