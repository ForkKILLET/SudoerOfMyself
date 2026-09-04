import { createCommand } from '@/sys0/program'
import { UserError } from '@/utils/errors'
import { HSH_RESERVED_WORDS } from './hsh/reserved_words'
import { BuiltinRegistryProvider, resolveShellCommand } from './resolve_command'
import { formatAlias } from '@/sys0/alias'

export const createCommandBuiltin = (getBuiltins: BuiltinRegistryProvider) => (
  createCommand('command', '-v NAME...', 'Inspect command resolution.')
    .help('help')
    .option('identify', '-v', 'boolean', 'Print the command name or executable path')
    .program(({ proc, options }, ...names) => {
      if (! options.identify) throw new UserError('Only command -v is currently supported')
      let hasError = false
      names.forEach((name) => {
        const resolved = resolveShellCommand(proc, name, getBuiltins(), HSH_RESERVED_WORDS)
        if (resolved.isErr) {
          hasError = true
          return
        }
        if (resolved.val.kind === 'executable') proc.stdio.writeLn(resolved.val.path)
        else if (resolved.val.kind === 'alias') {
          proc.stdio.writeLn(`alias ${formatAlias(name, resolved.val.value)}`)
        }
        else proc.stdio.writeLn(name)
      })
      return hasError ? 1 : 0
    })
)
