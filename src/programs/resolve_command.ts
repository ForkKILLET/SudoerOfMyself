import { Ok, Result } from 'fk-result'
import { ExecError } from '@/sys0/exec'
import { Process } from '@/sys0/proc'
import { Program } from '@/sys0/program'

export type BuiltinRegistry = Readonly<Record<string, Program>>
export type BuiltinRegistryProvider = () => BuiltinRegistry

const NO_RESERVED_WORDS: ReadonlySet<string> = new Set()

export type ResolvedShellCommand =
  | { kind: 'reserved', name: string }
  | { kind: 'builtin', name: string }
  | { kind: 'executable', path: string }

export const resolveShellCommand = (
  process: Process,
  name: string,
  builtins: BuiltinRegistry,
  reservedWords: ReadonlySet<string> = NO_RESERVED_WORDS,
): Result<ResolvedShellCommand, ExecError> => {
  if (reservedWords.has(name)) return Ok({ kind: 'reserved', name })
  if (Object.hasOwn(builtins, name)) return Ok({ kind: 'builtin', name })
  return process.ctx.exec.resolve(name, {
    envPath: process.env.PATH,
    cwd: process.env.PWD,
  }).map(({ path }) => ({ kind: 'executable', path }))
}
