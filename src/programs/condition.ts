import { Err, Ok, type Result } from 'fk-result'
import { FileT } from '@/sys0/fs'
import type { Process } from '@/sys0/proc'
import { matchesShellPattern, type ShellPatternPart } from './shell_pattern'

export type ConditionUnaryOperator = '-n' | '-z' | '-e' | '-f' | '-d' | '-s' | '-x'
export type ConditionBinaryOperator =
  | '=' | '==' | '!=' | '<' | '>'
  | '-eq' | '-ne' | '-lt' | '-le' | '-gt' | '-ge'

export type ConditionExpression<T = string> =
  | { type: 'value', value: T }
  | { type: 'unary', operator: ConditionUnaryOperator, operand: T }
  | {
    type: 'binary'
    operator: ConditionBinaryOperator
    left: T
    right: T
    pattern?: readonly ShellPatternPart[]
  }
  | { type: 'not', operand: ConditionExpression<T> }
  | { type: 'and' | 'or', left: ConditionExpression<T>, right: ConditionExpression<T> }

export type ConditionError =
  | { type: 'syntax', message: string }
  | { type: 'invalid-integer', value: string }

const UNARY_OPERATORS: ReadonlySet<string> = new Set<ConditionUnaryOperator>([
  '-n', '-z', '-e', '-f', '-d', '-s', '-x',
])

const BINARY_OPERATORS: ReadonlySet<string> = new Set<ConditionBinaryOperator>([
  '=', '==', '!=', '<', '>',
  '-eq', '-ne', '-lt', '-le', '-gt', '-ge',
])

const syntaxError = (message: string): ConditionError => ({ type: 'syntax', message })

class ConditionParser {
  private cursor = 0

  constructor(
    private readonly tokens: readonly string[],
    private readonly singleOperandAsValue: boolean,
  ) {}

  parse(): Result<ConditionExpression, ConditionError> {
    if (! this.tokens.length) return Ok({ type: 'value', value: '' })
    if (this.singleOperandAsValue && this.tokens.length === 1) {
      return Ok({ type: 'value', value: this.tokens[0] })
    }
    const expression = this.parseOr()
    if (expression.isErr) return expression
    const trailing = this.peek()
    if (trailing !== undefined) return Err(syntaxError(`Unexpected operand: ${trailing}`))
    return expression
  }

  private parseOr(): Result<ConditionExpression, ConditionError> {
    const first = this.parseAnd()
    if (first.isErr) return first
    let left = first.val
    while (this.peek() === '-o') {
      this.cursor ++
      const right = this.parseAnd()
      if (right.isErr) return right
      left = { type: 'or', left, right: right.val }
    }
    return Ok(left)
  }

  private parseAnd(): Result<ConditionExpression, ConditionError> {
    const first = this.parseNot()
    if (first.isErr) return first
    let left = first.val
    while (this.peek() === '-a') {
      this.cursor ++
      const right = this.parseNot()
      if (right.isErr) return right
      left = { type: 'and', left, right: right.val }
    }
    return Ok(left)
  }

  private parseNot(): Result<ConditionExpression, ConditionError> {
    if (this.peek() !== '!') return this.parsePrimary()
    this.cursor ++
    const operand = this.parseNot()
    return operand.isErr ? operand : Ok({ type: 'not', operand: operand.val })
  }

  private parsePrimary(): Result<ConditionExpression, ConditionError> {
    const first = this.take()
    if (first === undefined) return Err(syntaxError('Expected condition'))
    if (first === '(') {
      const expression = this.parseOr()
      if (expression.isErr) return expression
      if (this.take() !== ')') return Err(syntaxError('Expected \')\''))
      return expression
    }
    if (UNARY_OPERATORS.has(first)) {
      const operand = this.take()
      if (operand === undefined) return Err(syntaxError(`Expected operand after ${first}`))
      return Ok({
        type: 'unary',
        operator: first as ConditionUnaryOperator,
        operand,
      })
    }

    const operator = this.peek()
    if (! operator || ! BINARY_OPERATORS.has(operator)) {
      return Ok({ type: 'value', value: first })
    }
    this.cursor ++
    const right = this.take()
    if (right === undefined) return Err(syntaxError(`Expected operand after ${operator}`))
    return Ok({
      type: 'binary',
      operator: operator as ConditionBinaryOperator,
      left: first,
      right,
    })
  }

  private peek() {
    return this.tokens[this.cursor]
  }

  private take() {
    return this.tokens[this.cursor ++]
  }
}

export const parseCondition = (
  tokens: readonly string[],
  { singleOperandAsValue = true }: { singleOperandAsValue?: boolean } = {},
): Result<ConditionExpression, ConditionError> => (
  new ConditionParser(tokens, singleOperandAsValue).parse()
)

const parseInteger = (value: string): Result<bigint, ConditionError> => {
  if (! /^[+-]?\d+$/.test(value)) return Err({ type: 'invalid-integer', value })
  return Ok(BigInt(value))
}

const evaluateUnary = (
  proc: Process,
  operator: ConditionUnaryOperator,
  operand: string,
) => {
  if (operator === '-n') return operand.length > 0
  if (operator === '-z') return operand.length === 0

  const found = proc.ctx.fs.findInode(operand, { cwd: proc.cwd })
  if (found.isErr) return false
  const { inode } = found.val
  switch (operator) {
    case '-e': return true
    case '-f': return inode.file.type === FileT.NORMAL
    case '-d': return inode.file.type === FileT.DIR
    case '-s': return inode.file.type === FileT.NORMAL && inode.file.content.length > 0
    case '-x': return proc.ctx.exec.isExecutable(inode)
  }
}

const evaluateBinary = (
  operator: ConditionBinaryOperator,
  left: string,
  right: string,
  pattern?: readonly ShellPatternPart[],
): Result<boolean, ConditionError> => {
  switch (operator) {
    case '=':
    case '==': return Ok(pattern ? matchesShellPattern(left, pattern) : left === right)
    case '!=': return Ok(pattern ? ! matchesShellPattern(left, pattern) : left !== right)
    case '<': return Ok(left < right)
    case '>': return Ok(left > right)
  }

  const leftInteger = parseInteger(left)
  if (leftInteger.isErr) return leftInteger
  const rightInteger = parseInteger(right)
  if (rightInteger.isErr) return rightInteger
  switch (operator) {
    case '-eq': return Ok(leftInteger.val === rightInteger.val)
    case '-ne': return Ok(leftInteger.val !== rightInteger.val)
    case '-lt': return Ok(leftInteger.val < rightInteger.val)
    case '-le': return Ok(leftInteger.val <= rightInteger.val)
    case '-gt': return Ok(leftInteger.val > rightInteger.val)
    case '-ge': return Ok(leftInteger.val >= rightInteger.val)
  }
}

export const evaluateCondition = (
  proc: Process,
  expression: ConditionExpression<string>,
): Result<boolean, ConditionError> => {
  switch (expression.type) {
    case 'value': return Ok(expression.value.length > 0)
    case 'unary': return Ok(evaluateUnary(proc, expression.operator, expression.operand))
    case 'binary': return evaluateBinary(
      expression.operator,
      expression.left,
      expression.right,
      expression.pattern,
    )
    case 'not': return evaluateCondition(proc, expression.operand).map(value => ! value)
    case 'and': {
      const left = evaluateCondition(proc, expression.left)
      if (left.isErr || ! left.val) return left
      return evaluateCondition(proc, expression.right)
    }
    case 'or': {
      const left = evaluateCondition(proc, expression.left)
      if (left.isErr || left.val) return left
      return evaluateCondition(proc, expression.right)
    }
  }
}

export const displayConditionError = (error: ConditionError) => {
  switch (error.type) {
    case 'syntax': return error.message
    case 'invalid-integer': return `${error.value}: integer expression expected`
  }
}
