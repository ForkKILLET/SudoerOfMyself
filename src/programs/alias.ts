import { createCommand } from '@/sys0/program'
import { formatAlias, isAliasName } from '@/sys0/alias'
import { UserError } from '@/utils/errors'

export const alias = createCommand('alias', '[NAME[=VALUE]...]', 'Define or display shell aliases.')
  .help('help')
  .whenUnknownOption('make-arg')
  .program(({ proc }, ...definitions) => {
    if (! definitions.length) {
      proc.aliases.entries()
        .sort(([left], [right]) => left.localeCompare(right))
        .forEach(([name, value]) => proc.stdio.writeLn(`alias ${formatAlias(name, value)}`))
      return 0
    }

    let failed = false
    definitions.forEach((definition) => {
      const separator = definition.indexOf('=')
      if (separator === - 1) {
        const value = proc.aliases.get(definition)
        if (value === undefined) {
          proc.error(`${definition}: not found`)
          failed = true
        }
        else proc.stdio.writeLn(`alias ${formatAlias(definition, value)}`)
        return
      }
      const name = definition.slice(0, separator)
      if (! isAliasName(name)) throw new UserError(`${name || definition}: invalid alias name`)
      proc.aliases.set(name, definition.slice(separator + 1))
    })
    return failed ? 1 : 0
  })

export const unalias = createCommand('unalias', '[-a] NAME...', 'Remove shell aliases.')
  .help('help')
  .option('all', '-a', 'boolean', 'Remove all aliases')
  .whenUnknownOption('make-arg')
  .program(({ proc, options }, ...names) => {
    if (options.all) {
      proc.aliases.clear()
      return 0
    }
    if (! names.length) throw new UserError('Missing alias name')
    let failed = false
    names.forEach((name) => {
      if (proc.aliases.delete(name)) return
      proc.error(`${name}: not found`)
      failed = true
    })
    return failed ? 1 : 0
  })
