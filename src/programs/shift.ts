import { wrapProgram } from '@/sys0/program'
import { UserError } from '@/utils/errors'
import { getPositionalParameters, setPositionalParameters } from './hsh/parameters'

export const shift = wrapProgram((proc, _self, ...args) => {
  if (args.length > 1) throw new UserError('Too many arguments')
  const countText = args[0] ?? '1'
  if (! /^\d+$/.test(countText)) throw new UserError(`${countText}: shift count must be non-negative`)
  const count = Number(countText)
  const positional = getPositionalParameters(proc)
  if (! Number.isSafeInteger(count) || count > positional.length) {
    throw new UserError(`Cannot shift ${countText} positional parameter(s)`)
  }
  setPositionalParameters(proc, positional.slice(count))
  return 0
})
