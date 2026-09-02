import { Env, getEnv } from '@/sys0/env'
import { UserError } from '@/utils/errors'

type ArithmeticToken =
  | { type: 'number' | 'name' | 'operator', value: string }
  | { type: 'end', value: '' }

const OPERATORS = ['||', '&&', '==', '!=', '<=', '>=', '<<', '>>']
const SINGLE_OPERATORS = new Set('+-*/%()<>|&^!~')

const tokenizeArithmetic = (source: string) => {
  const tokens: ArithmeticToken[] = []
  let index = 0
  while (index < source.length) {
    const char = source[index]
    if (/\s/u.test(char)) {
      index ++
      continue
    }
    const operator = OPERATORS.find(operator => source.startsWith(operator, index))
    if (operator) {
      tokens.push({ type: 'operator', value: operator })
      index += operator.length
      continue
    }
    if (SINGLE_OPERATORS.has(char)) {
      tokens.push({ type: 'operator', value: char })
      index ++
      continue
    }
    const rest = source.slice(index)
    const number = /^(?:0[xX][\da-fA-F]+|\d+)/.exec(rest)?.[0]
    if (number) {
      tokens.push({ type: 'number', value: number })
      index += number.length
      continue
    }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest)?.[0]
    if (name) {
      tokens.push({ type: 'name', value: name })
      index += name.length
      continue
    }
    throw new UserError(`Invalid arithmetic token: ${char}`)
  }
  tokens.push({ type: 'end', value: '' })
  return tokens
}

const PRECEDENCE: Record<string, number> = {
  '||': 1,
  '&&': 2,
  '|': 3,
  '^': 4,
  '&': 5,
  '==': 6,
  '!=': 6,
  '<': 7,
  '<=': 7,
  '>': 7,
  '>=': 7,
  '<<': 8,
  '>>': 8,
  '+': 9,
  '-': 9,
  '*': 10,
  '/': 10,
  '%': 10,
}

const truth = (value: bigint) => value !== 0n

class ArithmeticParser {
  private cursor = 0

  constructor(
    private readonly tokens: ArithmeticToken[],
    private readonly env: Env,
  ) {}

  parse() {
    const value = this.parseExpression(1)
    if (this.peek().type !== 'end') {
      throw new UserError(`Unexpected arithmetic token: ${this.peek().value}`)
    }
    return value
  }

  private peek() {
    return this.tokens[this.cursor]
  }

  private consume() {
    return this.tokens[this.cursor ++]
  }

  private parseExpression(minPrecedence: number): bigint {
    let left = this.parseUnary()
    while (true) {
      const token = this.peek()
      if (token.type !== 'operator') break
      const precedence = PRECEDENCE[token.value]
      if (precedence === undefined || precedence < minPrecedence) break
      this.consume()
      const right = this.parseExpression(precedence + 1)
      left = this.applyBinary(token.value, left, right)
    }
    return left
  }

  private parseUnary(): bigint {
    const token = this.peek()
    if (token.type === 'operator' && ['+', '-', '!', '~'].includes(token.value)) {
      this.consume()
      const value = this.parseUnary()
      switch (token.value) {
        case '+': return value
        case '-': return - value
        case '!': return truth(value) ? 0n : 1n
        case '~': return ~ value
      }
    }
    if (token.type === 'operator' && token.value === '(') {
      this.consume()
      const value = this.parseExpression(1)
      const closing = this.consume()
      if (closing.type !== 'operator' || closing.value !== ')') {
        throw new UserError('Expected closing parenthesis in arithmetic expansion')
      }
      return value
    }
    if (token.type === 'number') {
      this.consume()
      return BigInt(token.value)
    }
    if (token.type === 'name') {
      this.consume()
      const value = getEnv(this.env, token.value)
      if (! value) return 0n
      try {
        return BigInt(value)
      }
      catch {
        throw new UserError(`${token.value}: non-integer arithmetic value: ${value}`)
      }
    }
    throw new UserError(`Expected arithmetic value, got: ${token.value || 'end of input'}`)
  }

  private applyBinary(operator: string, left: bigint, right: bigint): bigint {
    switch (operator) {
      case '||': return truth(left) || truth(right) ? 1n : 0n
      case '&&': return truth(left) && truth(right) ? 1n : 0n
      case '|': return left | right
      case '^': return left ^ right
      case '&': return left & right
      case '==': return left === right ? 1n : 0n
      case '!=': return left !== right ? 1n : 0n
      case '<': return left < right ? 1n : 0n
      case '<=': return left <= right ? 1n : 0n
      case '>': return left > right ? 1n : 0n
      case '>=': return left >= right ? 1n : 0n
      case '<<': return left << right
      case '>>': return left >> right
      case '+': return left + right
      case '-': return left - right
      case '*': return left * right
      case '/': {
        if (right === 0n) throw new UserError('Division by zero in arithmetic expansion')
        return left / right
      }
      case '%': {
        if (right === 0n) throw new UserError('Division by zero in arithmetic expansion')
        return left % right
      }
    }
    throw new UserError(`Unsupported arithmetic operator: ${operator}`)
  }
}

export const expandArithmetic = (source: string, env: Env) => (
  new ArithmeticParser(tokenizeArithmetic(source), env).parse().toString()
)
