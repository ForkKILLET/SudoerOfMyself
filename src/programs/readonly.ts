import { createCommand } from '@/sys0/program'
import { isEnvName } from '@/sys0/env'

export const readonly = createCommand('readonly', '[NAME[=VALUE]...]', 'Mark shell variables as read-only.')
  .help('help')
  .option('print', '-p', 'boolean', 'Print all read-only variables')
  .program(({ proc }, ...assignments) => {
    if (! assignments.length) {
      proc.variables.readonlyEntries()
        .sort(([left], [right]) => left.localeCompare(right))
        .forEach(([name, value]) => proc.stdio.writeLn(`readonly ${name}=${value}`))
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
      if (separator !== - 1) proc.variables.set(name, assignment.slice(separator + 1))
      proc.variables.makeReadonly(name)
    })
    return hasError ? 1 : 0
  })
