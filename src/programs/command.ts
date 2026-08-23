import { createCommand } from '@/sys0/program'
import { UserError } from '@/utils/errors'
import { BuiltinRegistryProvider, resolveShellCommand } from './resolve_command'

export const createCommandBuiltin = (getBuiltins: BuiltinRegistryProvider) => (
  createCommand('command', '-v NAME...', 'Inspect command resolution.')
    .help('help')
    .option('identify', '-v', 'boolean', 'Print the command name or executable path')
    .program(({ proc, options }, ...names) => {
      if (! options.identify) throw new UserError('Only command -v is currently supported')
      let hasError = false
      names.forEach((name) => {
        const resolved = resolveShellCommand(proc, name, getBuiltins())
        if (resolved.isErr) {
          hasError = true
          return
        }
        proc.stdio.writeLn(resolved.val.kind === 'builtin' ? name : resolved.val.path)
      })
      return hasError ? 1 : 0
    })
)
