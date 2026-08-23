import { wrapProgram } from '@/sys0/program'
import { UserError } from '@/utils/errors'
import { requestShellExit } from './hsh/control'

const parseExitCode = (value: string) => {
  if (! /^[+-]?\d+$/.test(value)) return null
  const code = BigInt(value)
  return Number((code % 256n + 256n) % 256n)
}

export const exit = wrapProgram((proc, _self, ...args) => {
  if (args.length > 1) throw new UserError('Too many arguments')
  const value = args[0] ?? proc.env['?'] ?? '0'
  const code = parseExitCode(value)
  if (code === null) {
    proc.error(`${value}: numeric argument required`)
    return requestShellExit(proc, 2)
  }
  return requestShellExit(proc, code)
})
