import { createCommand } from '@/sys0/program'
import { isEnvName } from '@/sys0/env'

export const unset = createCommand('unset', 'NAME...', 'Remove environment variables.')
  .help('help')
  .program(({ proc }, ...names) => {
    let hasError = false
    names.forEach((name) => {
      if (! isEnvName(name)) {
        proc.error(`${name}: invalid environment variable name`)
        hasError = true
        return
      }
      proc.variables.unset(name)
    })
    return hasError ? 1 : 0
  })
