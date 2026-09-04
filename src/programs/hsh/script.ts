import { UserError } from '@/utils/errors'
import type { ConditionExpression } from '../condition'
import { parseDoubleBracketCondition } from './conditional'
import { findShellParenthesisEnd } from './parse'
import { HSH_RESERVED_WORDS } from './reserved_words'

type ScriptToken =
  | { type: 'word', value: string, begin: number, end: number }
  | { type: 'operator', value: '(' | ')' | '|', begin: number, end: number }
  | { type: 'separator', value: ';' | '\n' | '&', begin: number, end: number }
  | { type: 'and' | 'or', begin: number, end: number }

export type HshListCondition = 'always' | 'success' | 'failure'

export interface HshControlScript {
  entries: HshListEntry[]
}

export interface HshListEntry {
  condition: HshListCondition
  statement: HshStatement
  background?: true
  source?: string
  timed?: true
}

export type HshStatement =
  | HshSimpleStatement
  | HshIfStatement
  | HshLoopStatement
  | HshForStatement
  | HshConditionalStatement
  | HshGroupStatement
  | HshFunctionDefinition
  | HshPipelineStatement
  | HshRedirectedStatement

export interface HshSimpleStatement {
  type: 'simple'
  source: string
}

export interface HshIfBranch {
  condition: HshControlScript
  body: HshControlScript
}

export interface HshIfStatement {
  type: 'if'
  branches: HshIfBranch[]
  elseBody?: HshControlScript
}

export interface HshLoopStatement {
  type: 'while' | 'until'
  condition: HshControlScript
  body: HshControlScript
}

export interface HshForStatement {
  type: 'for'
  name: string
  wordsSource: string
  body: HshControlScript
}

export interface HshConditionalStatement {
  type: 'conditional'
  expression: ConditionExpression<string>
}

export interface HshGroupStatement {
  type: 'group'
  mode: 'current' | 'subshell'
  body: HshControlScript
}

export interface HshFunctionDefinition {
  type: 'functionDefinition'
  name: string
  body: HshStatement
}

export interface HshPipelineStatement {
  type: 'pipeline'
  stages: HshStatement[]
}

export interface HshRedirectedStatement {
  type: 'redirected'
  statement: HshStatement
  source: string
}

export class IncompleteHshScriptError extends UserError {}

const isInlineWhitespace = (char: string) => char === ' ' || char === '\t' || char === '\r'

const lexScript = (source: string) => {
  const tokens: ScriptToken[] = []
  let index = 0

  while (index < source.length) {
    const char = source[index]
    if (isInlineWhitespace(char)) {
      index ++
      continue
    }
    if (char === '#') {
      const newline = source.indexOf('\n', index)
      index = newline === - 1 ? source.length : newline
      continue
    }
    if (char === '\n' || char === ';') {
      tokens.push({
        type: 'separator',
        value: char,
        begin: index,
        end: index + 1,
      })
      index ++
      continue
    }
    if (char === '(' || char === ')') {
      tokens.push({ type: 'operator', value: char, begin: index, end: index + 1 })
      index ++
      continue
    }
    if (source.startsWith('&&', index)) {
      tokens.push({ type: 'and', begin: index, end: index + 2 })
      index += 2
      continue
    }
    if (source.startsWith('||', index)) {
      tokens.push({ type: 'or', begin: index, end: index + 2 })
      index += 2
      continue
    }
    if (char === '|') {
      tokens.push({ type: 'operator', value: '|', begin: index, end: index + 1 })
      index ++
      continue
    }
    if (char === '&') {
      tokens.push({ type: 'separator', value: '&', begin: index, end: index + 1 })
      index ++
      continue
    }

    const begin = index
    let isSingleQuoted = false
    let isDoubleQuoted = false
    let isEscaped = false
    while (index < source.length) {
      const wordChar = source[index]
      if (! isSingleQuoted && source.startsWith('$(', index)) {
        const end = findShellParenthesisEnd(source, index + 1)
        if (end === - 1) {
          index = source.length
          break
        }
        index = end + 1
        continue
      }
      if (isEscaped) {
        isEscaped = false
        index ++
        continue
      }
      if (wordChar === '\\' && ! isSingleQuoted) {
        isEscaped = true
        index ++
        continue
      }
      if (wordChar === '\'' && ! isDoubleQuoted) {
        isSingleQuoted = ! isSingleQuoted
        index ++
        continue
      }
      if (wordChar === '"' && ! isSingleQuoted) {
        isDoubleQuoted = ! isDoubleQuoted
        index ++
        continue
      }
      if (! isSingleQuoted && ! isDoubleQuoted) {
        if (isInlineWhitespace(wordChar) || wordChar === '\n' || wordChar === ';') break
        if (wordChar === '(' || wordChar === ')') break
        if (source.startsWith('&&', index) || source.startsWith('||', index)) break
        if (wordChar === '|') break
        if (wordChar === '&' && source[index - 1] !== '>' && source[index - 1] !== '<') break
      }
      index ++
    }

    if (isEscaped) throw new IncompleteHshScriptError('Trailing escape character')
    if (isSingleQuoted) throw new IncompleteHshScriptError('Unmatched single quote')
    if (isDoubleQuoted) throw new IncompleteHshScriptError('Unmatched double quote')
    const value = source.slice(begin, index)
    if (! value) throw new UserError(`Unexpected token: ${source[index]}`)
    tokens.push({ type: 'word', value, begin, end: index })
  }

  return tokens
}

class ScriptParser {
  private cursor = 0

  constructor(
    private readonly source: string,
    private readonly tokens: readonly ScriptToken[],
  ) {}

  parse() {
    const script = this.parseList(new Set())
    const token = this.peek()
    if (token) throw new UserError(`Unexpected token: ${this.displayToken(token)}`)
    return script
  }

  private parseList(stopWords: ReadonlySet<string>): HshControlScript {
    const entries: HshListEntry[] = []
    let condition: HshListCondition = 'always'
    this.skipNewlines()

    while (this.cursor < this.tokens.length && ! this.isStopWord(stopWords)) {
      const statementBegin = this.peek() !.begin
      const timed = this.isWord('time')
      if (timed) {
        this.cursor ++
        this.skipNewlines()
        if (! this.peek()) throw new IncompleteHshScriptError('Expected command after time')
      }
      const statement = this.parseStatement()
      const next = this.peek()
      const isBackgroundCompound = next?.type === 'separator'
        && next.value === '&'
        && statement.type !== 'simple'
      entries.push({
        condition,
        statement,
        ...(timed ? { timed: true as const } : {}),
        ...(isBackgroundCompound ? {
          background: true as const,
          source: this.source.slice(
            statementBegin,
            this.tokens[this.cursor - 1]?.end,
          ).trim(),
        } : {}),
      })

      if (! next || this.isStopWord(stopWords)) break
      if (next.type === 'and' || next.type === 'or') {
        condition = next.type === 'and' ? 'success' : 'failure'
        this.cursor ++
        this.skipNewlines()
        if (! this.peek() || this.isStopWord(stopWords)) {
          throw new IncompleteHshScriptError(`Expected command after ${next.type === 'and' ? '&&' : '||'}`)
        }
        continue
      }
      if (next.type === 'separator') {
        condition = 'always'
        this.cursor ++
        this.skipNewlines()
        continue
      }
      throw new UserError(`Expected command separator before ${this.displayToken(next)}`)
    }

    return { entries }
  }

  private parseStatement(): HshStatement {
    const stages = [this.parseCommand()]
    while (this.peek()?.type === 'operator' && this.peekOperatorValue() === '|') {
      this.cursor ++
      this.skipNewlines()
      if (! this.peek()) throw new IncompleteHshScriptError('Expected command after |')
      stages.push(this.parseCommand())
    }
    return stages.length === 1 ? stages[0] : { type: 'pipeline', stages }
  }

  private parseCommand(): HshStatement {
    const token = this.peek()
    if (! token) throw new IncompleteHshScriptError('Expected command')
    let statement: HshStatement
    if (token.type === 'operator') {
      if (token.value === '(') statement = this.parseGroup('subshell')
      else throw new UserError(`Unexpected token: ${this.displayToken(token)}`)
    }
    else {
      if (token.type !== 'word') throw new UserError(`Unexpected token: ${this.displayToken(token)}`)
      if (this.isFunctionDefinitionStart()) statement = this.parseFunctionDefinition()
      else switch (token.value) {
        case '[[':
          statement = this.parseConditional()
          break
        case '{':
          statement = this.parseGroup('current')
          break
        case 'function':
          statement = this.parseKeywordFunctionDefinition()
          break
        case 'if':
          statement = this.parseIf()
          break
        case 'while':
          statement = this.parseLoop('while')
          break
        case 'until':
          statement = this.parseLoop('until')
          break
        case 'for':
          statement = this.parseFor()
          break
        default:
          if (HSH_RESERVED_WORDS.has(token.value)) throw new UserError(`Unexpected '${token.value}'`)
          return this.parseSimple()
      }
    }

    const redirectionBegin = this.peek()
    if (redirectionBegin?.type !== 'word') return statement
    let end = redirectionBegin.end
    while (this.peek()?.type === 'word') end = this.tokens[this.cursor ++].end
    return {
      type: 'redirected',
      statement,
      source: this.source.slice(redirectionBegin.begin, end),
    }
  }

  private parseGroup(mode: HshGroupStatement['mode']): HshGroupStatement {
    const open = mode === 'subshell' ? '(' : '{'
    const close = mode === 'subshell' ? ')' : '}'
    if (mode === 'subshell') this.requireOperator('(')
    else this.requireWord('{')
    const body = this.requireNonEmpty(
      this.parseList(new Set([close])),
      `Expected command after ${open}`,
    )
    if (mode === 'subshell') this.requireOperator(')')
    else this.requireWord('}')
    return { type: 'group', mode, body }
  }

  private isFunctionDefinitionStart() {
    const name = this.peek()
    const open = this.tokens[this.cursor + 1]
    const close = this.tokens[this.cursor + 2]
    return name?.type === 'word'
      && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name.value)
      && open?.type === 'operator'
      && open.value === '('
      && close?.type === 'operator'
      && close.value === ')'
  }

  private parseFunctionDefinition(): HshFunctionDefinition {
    const name = this.peek() !
    if (name.type !== 'word') throw new Error('Function name token must be a word')
    if (HSH_RESERVED_WORDS.has(name.value)) {
      throw new UserError(`Invalid function name: ${name.value}`)
    }
    this.cursor ++
    this.requireOperator('(')
    this.requireOperator(')')
    return this.parseFunctionBody(name.value)
  }

  private parseKeywordFunctionDefinition(): HshFunctionDefinition {
    this.requireWord('function')
    const name = this.peek()
    if (! name) throw new IncompleteHshScriptError('Expected function name')
    if (
      name.type !== 'word'
      || ! /^[A-Za-z_][A-Za-z0-9_]*$/.test(name.value)
      || HSH_RESERVED_WORDS.has(name.value)
    ) {
      throw new UserError(`Invalid function name: ${this.displayToken(name)}`)
    }
    this.cursor ++
    if (this.peek()?.type === 'operator' && this.peekOperatorValue() === '(') {
      this.requireOperator('(')
      this.requireOperator(')')
    }
    return this.parseFunctionBody(name.value)
  }

  private parseFunctionBody(name: string): HshFunctionDefinition {
    this.skipNewlines()
    if (! this.peek()) throw new IncompleteHshScriptError('Expected function body')
    const body = this.parseCommand()
    if (body.type === 'simple' || body.type === 'functionDefinition') {
      throw new UserError('Function body must be a compound command')
    }
    return { type: 'functionDefinition', name, body }
  }

  private parseConditional(): HshConditionalStatement {
    const open = this.peek() !
    this.requireWord('[[')
    while (this.cursor < this.tokens.length) {
      const token = this.peek() !
      if (token.type === 'word' && token.value === ']]') {
        const expression = parseDoubleBracketCondition(
          this.source.slice(open.end, token.begin),
        )
        this.cursor ++
        return { type: 'conditional', expression }
      }
      this.cursor ++
    }
    throw new IncompleteHshScriptError('Expected \']]\'')
  }

  private parseSimple(): HshSimpleStatement {
    const first = this.peek()
    if (! first || first.type !== 'word') throw new UserError('Expected command')
    let end = first.end
    while (this.peek()?.type === 'word') {
      end = this.tokens[this.cursor ++].end
    }
    const separator = this.peek()
    if (separator?.type === 'separator' && separator.value === '&') end = separator.end
    return {
      type: 'simple',
      source: this.source.slice(first.begin, end).trim(),
    }
  }

  private parseIf(): HshIfStatement {
    this.requireWord('if')
    const branches: HshIfBranch[] = []
    let condition = this.requireNonEmpty(
      this.parseList(new Set(['then'])),
      'Expected condition after if',
    )
    this.requireWord('then')

    while (true) {
      const body = this.requireNonEmpty(
        this.parseList(new Set(['elif', 'else', 'fi'])),
        'Expected command after then',
      )
      branches.push({ condition, body })
      if (this.isWord('elif')) {
        this.cursor ++
        condition = this.requireNonEmpty(
          this.parseList(new Set(['then'])),
          'Expected condition after elif',
        )
        this.requireWord('then')
        continue
      }
      if (this.isWord('else')) {
        this.cursor ++
        const elseBody = this.requireNonEmpty(
          this.parseList(new Set(['fi'])),
          'Expected command after else',
        )
        this.requireWord('fi')
        return { type: 'if', branches, elseBody }
      }
      this.requireWord('fi')
      return { type: 'if', branches }
    }
  }

  private parseLoop(type: 'while' | 'until'): HshLoopStatement {
    this.requireWord(type)
    const condition = this.requireNonEmpty(
      this.parseList(new Set(['do'])),
      `Expected condition after ${type}`,
    )
    this.requireWord('do')
    const body = this.requireNonEmpty(
      this.parseList(new Set(['done'])),
      `Expected command after do`,
    )
    this.requireWord('done')
    return { type, condition, body }
  }

  private parseFor(): HshForStatement {
    this.requireWord('for')
    const variable = this.peek()
    if (! variable) throw new IncompleteHshScriptError('Expected variable name after for')
    if (variable.type !== 'word' || ! /^[A-Za-z_][A-Za-z0-9_]*$/.test(variable.value)) {
      throw new UserError(`Invalid for-loop variable: ${this.displayToken(variable)}`)
    }
    this.cursor ++
    this.requireWord('in')

    const firstWord = this.peek()
    let wordsSource = ''
    if (firstWord?.type === 'word') {
      let end = firstWord.end
      const begin = firstWord.begin
      while (this.peek()?.type === 'word') end = this.tokens[this.cursor ++].end
      wordsSource = this.source.slice(begin, end)
    }
    const separator = this.peek()
    if (
      ! separator
      || separator.type !== 'separator'
      || separator.value === '&'
    ) {
      throw new IncompleteHshScriptError(`Expected ';' or newline before do`)
    }
    this.cursor ++
    this.skipNewlines()
    this.requireWord('do')
    const body = this.requireNonEmpty(
      this.parseList(new Set(['done'])),
      `Expected command after do`,
    )
    this.requireWord('done')
    return { type: 'for', name: variable.value, wordsSource, body }
  }

  private requireNonEmpty(script: HshControlScript, message: string) {
    if (! script.entries.length) {
      if (! this.peek()) throw new IncompleteHshScriptError(message)
      throw new UserError(message)
    }
    return script
  }

  private requireWord(word: string) {
    const token = this.peek()
    if (! token) throw new IncompleteHshScriptError(`Expected '${word}'`)
    if (token.type !== 'word' || token.value !== word) {
      throw new UserError(`Expected '${word}', got ${this.displayToken(token)}`)
    }
    this.cursor ++
  }

  private requireOperator(operator: '(' | ')') {
    const token = this.peek()
    if (! token) throw new IncompleteHshScriptError(`Expected '${operator}'`)
    if (token.type !== 'operator' || token.value !== operator) {
      throw new UserError(`Expected '${operator}', got ${this.displayToken(token)}`)
    }
    this.cursor ++
  }

  private isWord(word: string) {
    const token = this.peek()
    return token?.type === 'word' && token.value === word
  }

  private isStopWord(words: ReadonlySet<string>) {
    const token = this.peek()
    return (token?.type === 'word' || token?.type === 'operator') && words.has(token.value)
  }

  private skipNewlines() {
    while (this.peek()?.type === 'separator' && this.peekSeparatorValue() === '\n') {
      this.cursor ++
    }
  }

  private peekSeparatorValue() {
    const token = this.peek()
    return token?.type === 'separator' ? token.value : undefined
  }

  private peekOperatorValue() {
    const token = this.peek()
    return token?.type === 'operator' ? token.value : undefined
  }

  private peek() {
    return this.tokens[this.cursor]
  }

  private displayToken(token: ScriptToken) {
    return token.type === 'word' || token.type === 'operator' || token.type === 'separator'
      ? token.value
      : token.type === 'and' ? '&&' : '||'
  }
}

export const parseControlScript = (source: string) => new ScriptParser(source, lexScript(source)).parse()
