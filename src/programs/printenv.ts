import { createCommand } from '@/sys0/program'

export const printenv = createCommand('printenv', '[NAME...]', 'Print exported environment variables.')
  .help('help')
  .program(({ proc }, ...names) => {
    const environment = proc.variables.environment()
    if (! names.length) {
      Object.entries(environment)
        .sort(([left], [right]) => left.localeCompare(right))
        .forEach(([name, value]) => proc.stdio.writeLn(`${name}=${value}`))
      return 0
    }

    let missing = false
    names.forEach((name) => {
      if (! Object.hasOwn(environment, name)) missing = true
      else proc.stdio.writeLn(environment[name])
    })
    return missing ? 1 : 0
  })
