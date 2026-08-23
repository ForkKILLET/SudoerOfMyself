import { Ok, Result } from 'fk-result'
import { ExecError } from '@/sys0/exec'
import { Process } from '@/sys0/proc'
import { Program } from '@/sys0/program'

export type BuiltinRegistry = Readonly<Record<string, Program>>
export type BuiltinRegistryProvider = () => BuiltinRegistry

export type ResolvedShellCommand =
  | { kind: 'builtin', name: string }
  | { kind: 'executable', path: string }

export const resolveShellCommand = (
  process: Process,
  name: string,
  builtins: BuiltinRegistry,
): Result<ResolvedShellCommand, ExecError> => {
  if (name in builtins) return Ok({ kind: 'builtin', name })
  return process.ctx.exec.resolve(name, {
    envPath: process.env.PATH,
    cwd: process.env.PWD,
  }).map(({ path }) => ({ kind: 'executable', path }))
}
