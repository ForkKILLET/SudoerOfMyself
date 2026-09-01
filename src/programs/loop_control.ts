import { wrapProgram, type Program } from '@/sys0/program'
import { UserError } from '@/utils/errors'
import { requestLoopControl, type LoopControlType } from './hsh/control'

const createLoopControl = (type: LoopControlType): Program => wrapProgram((proc, self, ...args) => {
  if (args.length > 1) throw new UserError('Too many arguments')
  const operand = args[0] ?? '1'
  if (! /^\d+$/.test(operand) || Number(operand) < 1 || ! Number.isSafeInteger(Number(operand))) {
    throw new UserError(`${operand}: numeric argument required`)
  }
  if (! requestLoopControl(proc, type, Number(operand))) {
    proc.error(`${self}: only meaningful in a loop`)
    return 1
  }
  return 0
})

export const breakLoop = createLoopControl('break')
export const continueLoop = createLoopControl('continue')
