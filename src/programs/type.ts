import { createCommand } from '@/sys0/program'
import { ExecError, ExecErrorT } from '@/sys0/exec'
import { FOp } from '@/sys0/fs'
import { UserError } from '@/utils/errors'
import { HSH_RESERVED_WORDS } from './hsh/reserved_words'
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
        const resolved = resolveShellCommand(proc, name, getBuiltins(), HSH_RESERVED_WORDS)
        if (resolved.isErr) {
          proc.error(displayResolutionError(name, resolved.err))
          hasError = true
          return
        }
        switch (resolved.val.kind) {
          case 'reserved':
            proc.stdio.writeLn(`${name} is a reserved word`)
            break
          case 'builtin':
            proc.stdio.writeLn(`${name} is a shell builtin`)
            break
          case 'executable':
            proc.stdio.writeLn(`${name} is ${resolved.val.path}`)
            break
        }
      })
      return hasError ? 1 : 0
    })
)
