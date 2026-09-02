import type { Program } from '@/sys0/program'
import { displayConditionError, evaluateCondition, parseCondition } from './condition'

const evaluate = (proc: Parameters<Program>[0], args: readonly string[]) => {
  const parsed = parseCondition(args)
  if (parsed.isErr) {
    proc.error(displayConditionError(parsed.err))
    return 2
  }
  const evaluated = evaluateCondition(proc, parsed.val)
  if (evaluated.isErr) {
    proc.error(displayConditionError(evaluated.err))
    return 2
  }
  return evaluated.val ? 0 : 1
}

export const test: Program = (proc, _name, ...args) => evaluate(proc, args)

export const bracket: Program = (proc, _name, ...args) => {
  if (args.at(- 1) !== ']') {
    proc.error('Missing \']\'')
    return 2
  }
  return evaluate(proc, args.slice(0, - 1))
}
