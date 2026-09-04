import { createCommand } from '@/sys0/program'
import { isEnvName } from '@/sys0/env'

export const unset = createCommand('unset', '[-f] NAME...', 'Remove variables or shell functions.')
  .help('help')
  .option('functions', '-f', 'boolean', 'Remove shell functions')
  .program(({ proc, options }, ...names) => {
    let hasError = false
    names.forEach((name) => {
      if (! isEnvName(name)) {
        proc.error(`${name}: invalid ${options.functions ? 'function' : 'environment variable'} name`)
        hasError = true
        return
      }
      if (options.functions) proc.functions.delete(name)
      else proc.variables.unset(name)
    })
    return hasError ? 1 : 0
  })
