import { createCommand } from '@/sys0/program'
import { ExecError, ExecErrorT } from '@/sys0/exec'
import { FOp } from '@/sys0/fs'
import { UserError } from '@/utils/errors'
import { BuiltinRegistryProvider, resolveShellCommand } from './resolve_command'

const displayResolutionError = (name: string, error: ExecError) => {
  switch (error.type) {
    case ExecErrorT.NOT_FOUND:
      return `${name}: not found`
    case ExecErrorT.NOT_EXECUTABLE:
      return `${error.path}: not executable`
    case ExecErrorT.NATIVE_PROGRAM_NOT_REGISTERED:
      return `${name}: native program '${error.programId}' is unavailable`
    case ExecErrorT.FILE_SYSTEM_ERROR:
      return `${name}: ${FOp.displayError(error.error)}`
  }
}

export const createTypeCommand = (getBuiltins: BuiltinRegistryProvider) => (
  createCommand('type', 'NAME...', 'Describe how command names are resolved.')
    .help('help')
    .program(({ proc }, ...names) => {
      if (! names.length) throw new UserError('Missing command name')
      let hasError = false
      names.forEach((name) => {
        const resolved = resolveShellCommand(proc, name, getBuiltins())
        if (resolved.isErr) {
          proc.error(displayResolutionError(name, resolved.err))
          hasError = true
          return
        }
        proc.stdio.writeLn(resolved.val.kind === 'builtin'
          ? `${name} is a shell builtin`
          : `${name} is ${resolved.val.path}`)
      })
      return hasError ? 1 : 0
    })
)
