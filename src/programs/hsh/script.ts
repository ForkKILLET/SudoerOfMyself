import { UserError } from '@/utils/errors'
import type { ConditionExpression } from '../condition'
import { parseDoubleBracketCondition } from './conditional'
import { findShellParenthesisEnd } from './parse'
import { HSH_RESERVED_WORDS } from './reserved_words'

type ScriptToken =
  | { type: 'word', value: string, begin: number, end: number }
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
}

export type HshStatement =
  | HshSimpleStatement
  | HshIfStatement
  | HshLoopStatement
  | HshForStatement
  | HshConditionalStatement

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
        if (source.startsWith('&&', index) || source.startsWith('||', index)) break
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
      const statement = this.parseStatement()
      const next = this.peek()
      const isBackgroundCompound = next?.type === 'separator'
        && next.value === '&'
        && statement.type !== 'simple'
      entries.push({
        condition,
        statement,
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
    const token = this.peek()
    if (! token) throw new IncompleteHshScriptError('Expected command')
    if (token.type !== 'word') throw new UserError(`Unexpected token: ${this.displayToken(token)}`)
    switch (token.value) {
      case '[[': return this.parseConditional()
      case 'if': return this.parseIf()
      case 'while': return this.parseLoop('while')
      case 'until': return this.parseLoop('until')
      case 'for': return this.parseFor()
      default:
        if (HSH_RESERVED_WORDS.has(token.value)) throw new UserError(`Unexpected '${token.value}'`)
        return this.parseSimple()
    }
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

  private isWord(word: string) {
    const token = this.peek()
    return token?.type === 'word' && token.value === word
  }

  private isStopWord(words: ReadonlySet<string>) {
    const token = this.peek()
    return token?.type === 'word' && words.has(token.value)
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

  private peek() {
    return this.tokens[this.cursor]
  }

  private displayToken(token: ScriptToken) {
    return token.type === 'word' || token.type === 'separator'
      ? token.value
      : token.type === 'and' ? '&&' : '||'
  }
}

export const parseControlScript = (source: string) => new ScriptParser(source, lexScript(source)).parse()
