import { createCommand } from '@/sys0/program'
import { isEnvName } from '@/sys0/env'

export const exportEnv = createCommand('export', '[NAME[=VALUE]...]', 'Set environment variables.')
  .help('help')
  .program(({ proc }, ...assignments) => {
    if (! assignments.length) {
      Object.entries(proc.env)
        .filter(([name]) => isEnvName(name))
        .sort(([left], [right]) => left.localeCompare(right))
        .forEach(([name, value]) => proc.stdio.writeLn(`export ${name}=${value}`))
      return 0
    }

    let hasError = false
    assignments.forEach((assignment) => {
      const separator = assignment.indexOf('=')
      const name = separator === - 1 ? assignment : assignment.slice(0, separator)
      if (! isEnvName(name)) {
        proc.error(`${assignment}: invalid environment variable name`)
        hasError = true
        return
      }
      if (separator !== - 1) proc.env[name] = assignment.slice(separator + 1)
      else proc.env[name] ??= ''
    })
    return hasError ? 1 : 0
  })
