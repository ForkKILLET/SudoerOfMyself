import type { Env } from '@/sys0/env'
import type { Process } from '@/sys0/proc'
import { UserError } from '@/utils/errors'
import {
  type ConditionExpression,
  displayConditionError,
  evaluateCondition,
  parseCondition,
} from '../condition'
import type { ShellPatternPart } from '../shell_pattern'
import {
  expand,
  expandLineAsync,
  findParameterEnd,
  findShellParenthesisEnd,
  tokenize,
} from './parse'

const isWhitespace = (char: string) => /\s/u.test(char)
const LOGICAL_OPERATORS = ['&&', '||']
const WORD_OPERATORS = ['==', '!=', '-eq', '-ne', '-lt', '-le', '-gt', '-ge']
const ONE_CHARACTER_OPERATORS = new Set(['!', '(', ')', '<', '>', '='])
const WORD_BREAK_CHARACTERS = new Set(['(', ')', '<', '>'])

const isOperatorBoundary = (source: string, index: number) => (
  index >= source.length
  || isWhitespace(source[index])
  || source[index] === ';'
  || ONE_CHARACTER_OPERATORS.has(source[index])
  || LOGICAL_OPERATORS.some(operator => source.startsWith(operator, index))
)

const lexDoubleBracket = (source: string) => {
  const tokens: string[] = []
  let index = 0
  while (index < source.length) {
    if (isWhitespace(source[index])) {
      index ++
      continue
    }
    if (source[index] === ';') throw new UserError('Unexpected \';\' in conditional expression')
    const multiCharacterOperator = [
      ...LOGICAL_OPERATORS,
      ...WORD_OPERATORS.filter(operator => (
        source.startsWith(operator, index)
        && isOperatorBoundary(source, index + operator.length)
      )),
    ].find(operator => source.startsWith(operator, index))
    if (multiCharacterOperator) {
      tokens.push(multiCharacterOperator === '&&'
        ? '-a'
        : multiCharacterOperator === '||' ? '-o' : multiCharacterOperator)
      index += multiCharacterOperator.length
      continue
    }
    const oneCharacterOperator = source[index]
    const isStandaloneOperator = (
      oneCharacterOperator !== '!'
      && oneCharacterOperator !== '='
    ) || isOperatorBoundary(source, index + 1)
    if (ONE_CHARACTER_OPERATORS.has(oneCharacterOperator) && isStandaloneOperator) {
      tokens.push(source[index ++])
      continue
    }

    const begin = index
    let isSingleQuoted = false
    let isDoubleQuoted = false
    let isEscaped = false
    while (index < source.length) {
      const char = source[index]
      if (! isSingleQuoted && source.startsWith('$(', index)) {
        const end = findShellParenthesisEnd(source, index + 1)
        if (end === - 1) throw new UserError('Unmatched command or arithmetic expansion')
        index = end + 1
        continue
      }
      if (! isSingleQuoted && source.startsWith('${', index)) {
        const end = findParameterEnd(source, index + 1)
        if (end === - 1) throw new UserError('Unmatched parameter expansion')
        index = end + 1
        continue
      }
      if (isEscaped) {
        isEscaped = false
        index ++
        continue
      }
      if (char === '\\' && ! isSingleQuoted) {
        isEscaped = true
        index ++
        continue
      }
      if (char === '\'' && ! isDoubleQuoted) {
        isSingleQuoted = ! isSingleQuoted
        index ++
        continue
      }
      if (char === '"' && ! isSingleQuoted) {
        isDoubleQuoted = ! isDoubleQuoted
        index ++
        continue
      }
      if (! isSingleQuoted && ! isDoubleQuoted) {
        if (isWhitespace(char) || char === ';') break
        if (LOGICAL_OPERATORS.some(operator => source.startsWith(operator, index))) break
        if (WORD_BREAK_CHARACTERS.has(char)) break
      }
      index ++
    }
    if (isEscaped) throw new UserError('Trailing escape character')
    if (isSingleQuoted) throw new UserError('Unmatched single quote')
    if (isDoubleQuoted) throw new UserError('Unmatched double quote')
    const token = source.slice(begin, index)
    if (! token) throw new UserError(`Unexpected token: ${source[index]}`)
    tokens.push(token)
  }
  return tokens
}

export const parseDoubleBracketCondition = (source: string) => {
  const tokens = lexDoubleBracket(source)
  const parsed = parseCondition(tokens, { singleOperandAsValue: false })
  if (parsed.isErr) throw new UserError(displayConditionError(parsed.err))
  return parsed.val
}

const expandOperand = async (
  source: string,
  env: Env,
  substituteCommand: (source: string) => Promise<string>,
) => {
  const expanded = await expandLineAsync(source, env, {
    fieldSplitting: false,
    substituteCommand,
  })
  if (expanded.length !== 1 || expanded[0].type !== 'text') {
    throw new UserError(`Conditional operand expanded to ${expanded.length} words`)
  }
  return expanded[0].content
}

const expandPatternOperand = async (
  source: string,
  env: Env,
  substituteCommand: (source: string) => Promise<string>,
) => {
  const tokens = tokenize(source)
  const commandResults = new Map<number, string>()
  for (const token of tokens) {
    if (token.type !== 'substitution') continue
    commandResults.set(token.begin, await substituteCommand(token.content))
  }

  const parts: ShellPatternPart[] = []
  tokens.forEach((token) => {
    const expanded = expand([token], env, {
      commandResults,
      fieldSplitting: false,
    })
    if (expanded.length !== 1 || expanded[0].type !== 'text') {
      throw new UserError(`Conditional pattern fragment expanded to ${expanded.length} words`)
    }
    const quoted = ('isDq' in token && token.isDq)
      || ('isSq' in token && token.isSq)
      || (token.type === 'text' && token.isPatternLiteral)
    const previous = parts.at(- 1)
    if (previous?.literal === Boolean(quoted)) previous.value += expanded[0].content
    else parts.push({ value: expanded[0].content, literal: Boolean(quoted) })
  })
  return parts
}

export const evaluateDoubleBracketCondition = async (
  proc: Process,
  expression: ConditionExpression<string>,
  substituteCommand: (source: string) => Promise<string>,
): Promise<ReturnType<typeof evaluateCondition>> => {
  const env = proc.env
  switch (expression.type) {
    case 'value': return evaluateCondition(proc, {
      type: 'value',
      value: await expandOperand(expression.value, env, substituteCommand),
    })
    case 'unary': return evaluateCondition(proc, {
      type: 'unary',
      operator: expression.operator,
      operand: await expandOperand(expression.operand, env, substituteCommand),
    })
    case 'binary': {
      const left = await expandOperand(expression.left, env, substituteCommand)
      if (expression.operator === '=' || expression.operator === '==' || expression.operator === '!=') {
        const pattern = await expandPatternOperand(expression.right, env, substituteCommand)
        return evaluateCondition(proc, {
          type: 'binary',
          operator: expression.operator,
          left,
          right: pattern.map(part => part.value).join(''),
          pattern,
        })
      }
      return evaluateCondition(proc, {
        type: 'binary',
        operator: expression.operator,
        left,
        right: await expandOperand(expression.right, env, substituteCommand),
      })
    }
    case 'not': {
      const operand = await evaluateDoubleBracketCondition(proc, expression.operand, substituteCommand)
      return operand.map(value => ! value)
    }
    case 'and': {
      const left = await evaluateDoubleBracketCondition(proc, expression.left, substituteCommand)
      if (left.isErr || ! left.val) return left
      return evaluateDoubleBracketCondition(proc, expression.right, substituteCommand)
    }
    case 'or': {
      const left = await evaluateDoubleBracketCondition(proc, expression.left, substituteCommand)
      if (left.isErr || left.val) return left
      return evaluateDoubleBracketCondition(proc, expression.right, substituteCommand)
    }
  }
}
