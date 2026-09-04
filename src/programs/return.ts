import { wrapProgram } from '@/sys0/program'
import { UserError } from '@/utils/errors'
import { isInReturnContext, requestReturn } from './hsh/control'
import { parseShellStatus } from './hsh/status'

export const returnFromContext = wrapProgram((proc, self, ...args) => {
  if (args.length > 1) throw new UserError('Too many arguments')
  if (! isInReturnContext(proc)) {
    proc.error(`${self}: only meaningful in a function or sourced script`)
    return 1
  }

  const value = args[0] ?? proc.env['?'] ?? '0'
  const code = parseShellStatus(value)
  if (code === null) {
    proc.error(`${value}: numeric argument required`)
    return requestReturn(proc, 2) !
  }
  return requestReturn(proc, code) !
})
