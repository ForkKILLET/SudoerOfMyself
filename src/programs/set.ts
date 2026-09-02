import { wrapProgram } from '@/sys0/program'
import { isEnvName } from '@/sys0/env'
import { UserError } from '@/utils/errors'
import { setPositionalParameters } from './hsh/parameters'

export const set = wrapProgram((proc, _self, ...args) => {
  if (! args.length) {
    Object.entries(proc.env)
      .filter(([name]) => isEnvName(name))
      .sort(([left], [right]) => left.localeCompare(right))
      .forEach(([name, value]) => proc.stdio.writeLn(`${name}=${value}`))
    return 0
  }

  if (args[0].startsWith('-') && args[0] !== '--') {
    throw new UserError(`Unsupported shell option: ${args[0]}`)
  }
  setPositionalParameters(proc, args[0] === '--' ? args.slice(1) : args)
  return 0
})
