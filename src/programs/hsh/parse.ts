import { Env, getEnv, isEnvName } from '@/sys0/env'
import { UserError } from '@/utils/errors'

const ESCAPES: Record<string, string> = {
  n: '\n',
  r: '\r',
  t: '\t',
  a: '\x07',
  e: '\x1B',
}

export namespace HSH_CHARS {
  export const white = [...' \t\r\n']
  export const d8 = [...'01234567']
  export const d10 = [...d8, ...'89']
  export const d16 = [...d10, ...'abcdefABCDEF']
  export const letter = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ']
  export const senv = [...d10, '?', '!', '$', '#', '*', '@', '-']
  export const env = [...letter, ...d10, '_']
}

export const is = <K extends keyof typeof HSH_CHARS>(kind: K, ch: string) => HSH_CHARS[kind].includes(ch)

export type HshToken =
  | HshTokenText
  | HshTokenVariable
  | HshTokenHome
  | HshTokenBackground
  | HshTokenPipe
  | HshTokenRedirect

export type HshExpandedTokenText = Omit<HshTokenText, 'isDq' | 'isSq'>

export type HshExpandedToken =
  | HshExpandedTokenText
  | HshTokenBackground
  | HshTokenPipe
  | HshTokenRedirect

export interface HshTokenBase {
  begin: number
  end: number
  content: string
}

export interface HshTokenText extends HshTokenBase {
  type: 'text'
  isDq?: boolean
  isSq?: boolean
  isBraceLiteral?: boolean
}

export interface HshTokenVariable extends HshTokenBase {
  type: 'variable'
}

export interface HshTokenHome extends HshTokenBase {
  type: 'home'
}

export interface HshTokenRedirect extends HshTokenBase {
  type: 'redirect'
  fd: number
  mode: 'read' | 'write' | 'append' | 'duplicate-read' | 'duplicate-write'
}

export interface HshTokenPipe extends HshTokenBase {
  type: 'pipe'
}

export interface HshTokenBackground extends HshTokenBase {
  type: 'background'
}

export const tokenize = (line: string, isStrict = true) => {
  const tokens: HshToken[] = []
  let isEsc = false
  let isNesc = false as false | 'x' | 'u' | 'o'
  let isSq = false
  let isDq = false
  let quoteTokenCount = 0
  let quoteBufferedLength = 0
  let isVar = false
  let isWh = true
  let now = ''
  let enow = ''
  let vnow = ''
  let begin = 0
  let i = 0

  const consumeNow = (d = - 1) => {
    if (now) {
      tokens.push({
        type: 'text',
        content: now,
        begin,
        end: i - 1 + d,
        isDq,
        isSq,
      })
      now = ''
    }
    begin = i - 1
  }

  const consumeEnow = () => {
    now += String.fromCharCode(parseInt(enow, isNesc === 'o' ? 8 : 16))
    isNesc = false
    enow = ''
  }

  while (true) {
    const ch = line[i ++] ?? '\0'

    if (isEsc && ch === '\0') {
      if (isStrict) throw new UserError('Trailing escape character')
      now += '\\'
      break
    }
    if (isEsc && isDq) {
      if (ch === 'x' || ch === 'u' || ch === '0') isNesc = ch === '0' ? 'o' : ch
      else now += ESCAPES[ch] ?? ch
      isEsc = false
      continue
    }
    if (isEsc) {
      isEsc = false
      if (ch === '\0') {
        now += '\\'
        break
      }
      if (ch === '{' || ch === '}') {
        if (now) {
          tokens.push({
            type: 'text',
            content: now,
            begin,
            end: i - 3,
            isDq,
            isSq,
          })
          now = ''
        }
        tokens.push({
          type: 'text',
          content: ch,
          begin: i - 2,
          end: i - 1,
          isBraceLiteral: true,
        })
        begin = i
        continue
      }
      now += ch
      continue
    }
    if (isNesc) {
      if (enow.length < (isNesc === 'u' ? 4 : 2)) {
        if (is(isNesc === 'o' ? 'd8' : 'd16', ch)) {
          enow += ch
          continue
        }
        else if (isNesc === 'o') consumeEnow()
        else {
          now += isNesc + enow
          isNesc = false
          continue
        }
      }
      else consumeEnow()
    }
    if (isVar) {
      if (! vnow.length) {
        if (is('senv', ch)) {
          tokens.push({
            type: 'variable',
            content: '$' + ch,
            begin,
            end: i - 1,
          })
          isVar = false
          begin = i
          continue
        }
        else if (is('env', ch)) {
          vnow += ch
          continue
        }
        else {
          now += '$'
          isVar = false
        }
      }
      else {
        if (is('env', ch)) {
          vnow += ch
          continue
        }
        else {
          tokens.push({
            type: 'variable',
            content: '$' + vnow,
            begin,
            end: i - 2,
          })
          begin = i - 1
          isVar = false
          vnow = ''
        }
      }
    }
    if (ch === '\0') break
    const beginsWord = isWh
    if (is('white', ch) && ! isSq && ! isDq) {
      if (! isWh) {
        consumeNow()
        isWh = true
      }
      begin ++
      continue
    }
    else isWh = false
    if (! isDq && ! isSq && ch === '&') {
      consumeNow()
      tokens.push({
        type: 'background',
        begin: i - 1,
        end: i - 1,
        content: ch,
      })
      begin = i
      isWh = true
    }
    else if (! isDq && ! isSq && ch === '|') {
      consumeNow()
      tokens.push({
        type: 'pipe',
        begin: i - 1,
        end: i - 1,
        content: ch,
      })
      begin = i
      isWh = true
    }
    else if (! isDq && ! isSq && (ch === '>' || ch === '<')) {
      const previousToken = tokens.at(- 1)
      const isPendingDupTarget = previousToken?.type === 'redirect'
        && previousToken.mode.startsWith('duplicate-')
      const hasExplicitFd = ! isPendingDupTarget
        && begin === i - 1 - now.length
        && /^\d+$/.test(now)
      const parsedFd = hasExplicitFd ? Number(now) : undefined
      if (parsedFd !== undefined && ! Number.isSafeInteger(parsedFd)) {
        throw new UserError(`Invalid file descriptor: ${now}`)
      }
      const explicitFd = parsedFd
      if (explicitFd !== undefined) now = ''
      else consumeNow()
      if (line[i] === '&') {
        tokens.push({
          type: 'redirect',
          fd: explicitFd ?? (ch === '<' ? 0 : 1),
          mode: ch === '<' ? 'duplicate-read' : 'duplicate-write',
          begin,
          end: i,
          content: `${explicitFd ?? ''}${ch}&`,
        })
        i ++
      }
      else if (ch === '>' && line[i] === '>') {
        tokens.push({
          type: 'redirect',
          fd: explicitFd ?? 1,
          mode: 'append',
          begin,
          end: i,
          content: `${explicitFd ?? ''}>>`,
        })
        i ++
      }
      else {
        tokens.push({
          type: 'redirect',
          fd: explicitFd ?? (ch === '<' ? 0 : 1),
          mode: ch === '<' ? 'read' : 'write',
          begin,
          end: i - 1,
          content: `${explicitFd ?? ''}${ch}`,
        })
      }
      begin = i
      isWh = true
    }
    else if (ch === '\\' && ! isSq) isEsc = true
    else if (ch === '\'' && ! isDq) {
      if (isSq) {
        if (now) consumeNow(0)
        else if (tokens.length === quoteTokenCount && now.length === quoteBufferedLength) {
          tokens.push({
            type: 'text',
            content: '',
            begin,
            end: i - 1,
            isSq: true,
          })
        }
        begin = i
      }
      else {
        quoteTokenCount = tokens.length
        quoteBufferedLength = now.length
      }
      isSq = ! isSq
    }
    else if (ch === '"' && ! isSq) {
      if (isDq) {
        if (now) consumeNow(0)
        else if (tokens.length === quoteTokenCount && now.length === quoteBufferedLength) {
          tokens.push({
            type: 'text',
            content: '',
            begin,
            end: i - 1,
            isDq: true,
          })
        }
        begin = i
      }
      else {
        quoteTokenCount = tokens.length
        quoteBufferedLength = now.length
      }
      isDq = ! isDq
    }
    else if (
      ! isDq
      && ! isSq
      && beginsWord
      && ch === '~'
      && ['\0', '/', ...HSH_CHARS.white, '&', '|', '>', '<'].includes(line[i] ?? '\0')
    ) {
      consumeNow()
      tokens.push({
        type: 'home',
        begin,
        end: i - 1,
        content: '~',
      })
      begin = i
    }
    else if (! isSq && ch === '$') {
      if (is('env', line[i]) || is('senv', line[i])) {
        consumeNow()
        isVar = true
      }
      else now += ch
    }
    else now += ch
  }
  consumeNow()

  if (isStrict) {
    if (isSq) throw new UserError('Unmatched single quote')
    if (isDq) throw new UserError('Unmatched double quote')
  }

  return tokens
}

const MAX_BRACE_EXPANSIONS = 10_000

const splitBraceAlternatives = (body: string) => {
  const alternatives: string[] = []
  let depth = 0
  let begin = 0
  for (let index = 0; index < body.length; index ++) {
    const char = body[index]
    if (char === '{') depth ++
    else if (char === '}') depth --
    else if (char === ',' && depth === 0) {
      alternatives.push(body.slice(begin, index))
      begin = index + 1
    }
  }
  if (! alternatives.length) return null
  alternatives.push(body.slice(begin))
  return alternatives
}

const expandBraceRange = (body: string) => {
  const numeric = body.match(/^(-?\d+)\.\.(-?\d+)$/)
  if (numeric) {
    const start = Number(numeric[1])
    const end = Number(numeric[2])
    if (! Number.isSafeInteger(start) || ! Number.isSafeInteger(end)) return null
    const length = Math.abs(end - start) + 1
    if (length > MAX_BRACE_EXPANSIONS) {
      throw new UserError(`Brace expansion exceeds ${MAX_BRACE_EXPANSIONS} values`)
    }
    const width = Math.max(
      numeric[1].replace(/^-/, '').length,
      numeric[2].replace(/^-/, '').length,
    )
    const isPadded = /^-?0\d/.test(numeric[1]) || /^-?0\d/.test(numeric[2])
    const step = start <= end ? 1 : - 1
    return Array.from({ length }, (_, index) => {
      const value = start + index * step
      if (! isPadded) return String(value)
      const digits = String(Math.abs(value)).padStart(width, '0')
      return value < 0 ? `-${digits}` : digits
    })
  }

  const characters = body.match(/^(.?)\.\.(.?)$/u)
  if (! characters) return null
  const [startText, endText] = characters.slice(1)
  if (Array.from(startText).length !== 1 || Array.from(endText).length !== 1) return null
  const start = startText.codePointAt(0) !
  const end = endText.codePointAt(0) !
  const length = Math.abs(end - start) + 1
  if (length > MAX_BRACE_EXPANSIONS) {
    throw new UserError(`Brace expansion exceeds ${MAX_BRACE_EXPANSIONS} values`)
  }
  const step = start <= end ? 1 : - 1
  return Array.from({ length }, (_, index) => String.fromCodePoint(start + index * step))
}

interface BraceExpression {
  begin: number
  end: number
  alternatives: string[]
}

const findBraceExpression = (content: string): BraceExpression | null => {
  for (let begin = 0; begin < content.length; begin ++) {
    if (content[begin] !== '{') continue
    let depth = 1
    for (let end = begin + 1; end < content.length; end ++) {
      if (content[end] === '{') depth ++
      else if (content[end] === '}') depth --
      if (depth) continue
      const body = content.slice(begin + 1, end)
      const alternatives = splitBraceAlternatives(body) ?? expandBraceRange(body)
      if (alternatives) return { begin, end, alternatives }
      begin = end
      break
    }
  }
  return null
}

const expandBraceContent = (content: string): string[] => {
  const expression = findBraceExpression(content)
  if (! expression) return [content]
  const prefix = content.slice(0, expression.begin)
  const suffix = content.slice(expression.end + 1)
  const expanded: string[] = []
  for (const value of expression.alternatives) {
    for (const result of expandBraceContent(prefix + value + suffix)) {
      expanded.push(result)
      if (expanded.length > MAX_BRACE_EXPANSIONS) {
        throw new UserError(`Brace expansion exceeds ${MAX_BRACE_EXPANSIONS} values`)
      }
    }
  }
  return expanded
}

const expandBraces = (tokens: HshToken[]) => {
  const expanded: HshToken[] = []
  let word: HshToken[] = []

  const flushWord = () => {
    if (! word.length) return
    let variants: HshToken[][] = [[]]
    for (const token of word) {
      const contents = token.type === 'text'
        && ! token.isDq
        && ! token.isSq
        && ! token.isBraceLiteral
        ? expandBraceContent(token.content)
        : [token.content]
      if (variants.length * contents.length > MAX_BRACE_EXPANSIONS) {
        throw new UserError(`Brace expansion exceeds ${MAX_BRACE_EXPANSIONS} values`)
      }
      variants = variants.flatMap(variant => contents.map(content => [
        ...variant,
        token.type === 'text' ? { ...token, content } : token,
      ]))
    }
    expanded.push(...variants.flat())
    word = []
  }

  for (const token of tokens) {
    if (token.type === 'redirect' || token.type === 'pipe' || token.type === 'background') {
      flushWord()
      expanded.push(token)
      continue
    }
    const previous = word.at(- 1)
    if (previous && previous.end + 1 !== token.begin) flushWord()
    word.push(token)
  }
  flushWord()
  return expanded
}

export const expand = (tokens: HshToken[], env: Env): HshExpandedToken[] => {
  const expanded: HshExpandedToken[] = []

  let text: HshExpandedTokenText | null = null
  for (const token of expandBraces(tokens)) {
    if (token.type === 'redirect' || token.type === 'pipe' || token.type === 'background') {
      if (text) {
        expanded.push(text)
        text = null
      }
      expanded.push(token)
      continue
    }
    else {
      const content =
        token.type === 'text' ? token.content :
          token.type === 'home' ? env.HOME :
            token.type === 'variable' ? getEnv(env, token.content.slice(1)) :
              ''
      if (text) {
        if (text.end + 1 === token.begin) {
          text.content += content
          text.end = token.end
          continue
        }
        else {
          expanded.push(text)
        }
      }

      text = {
        type: 'text',
        content,
        begin: token.begin,
        end: token.end,
      }
    }
  }

  if (text) {
    expanded.push(text)
  }

  return expanded
}

export interface HshAstScript {
  commands: HshAstCommand[]
  background?: true
}

export interface HshEnvAssignment {
  name: string
  value: string
}

export interface HshAstCommand {
  name: string
  args: string[]
  assignments?: HshEnvAssignment[]
  pipeToNext?: true
  redirections?: HshAstRedirection[]
}

export type HshAstRedirection =
  | { fd: number, type: 'readFrom', path: string }
  | { fd: number, type: 'writeTo' | 'appendTo', path: string }
  | { fd: number, type: 'duplicate', sourceFd: number }
  | { fd: number, type: 'close' }

export const parseEnvAssignment = (word: string): HshEnvAssignment | null => {
  const separator = word.indexOf('=')
  if (separator === - 1) return null
  const name = word.slice(0, separator)
  if (! isEnvName(name)) return null
  return { name, value: word.slice(separator + 1) }
}

export const parse = (tokens: readonly HshExpandedToken[]): HshAstScript => {
  const script: HshAstScript = {
    commands: [],
  }
  let cursor = 0

  while (cursor < tokens.length) {
    const assignments: HshEnvAssignment[] = []
    while (tokens[cursor]?.type === 'text') {
      const assignment = parseEnvAssignment(tokens[cursor].content)
      if (! assignment) break
      assignments.push(assignment)
      cursor ++
    }
    if (cursor >= tokens.length) {
      script.commands.push({ name: '', args: [], assignments })
      break
    }

    const firstToken = tokens[cursor]
    if (firstToken.type === 'pipe') throw new UserError('Expected command before pipe')
    if (firstToken.type === 'background') throw new UserError('Expected command before background marker')
    const name = firstToken.type === 'redirect' ? 'cat' : firstToken.content
    if (firstToken.type !== 'redirect') cursor ++

    const command: HshAstCommand = {
      name,
      args: [],
      ...(assignments.length ? { assignments } : {}),
    }

    while (cursor < tokens.length) {
      const token = tokens[cursor ++]
      if (! token) break
      if (token.type === 'background') {
        if (cursor < tokens.length) throw new UserError('Background marker must end the command')
        script.background = true
        break
      }
      else if (token.type === 'pipe') {
        if (cursor >= tokens.length) throw new UserError('Expected command after pipe')
        command.pipeToNext = true
        break
      }
      else if (token.type === 'redirect') {
        const target = tokens[cursor ++]
        if (! target) throw new UserError('Expected redirect target, got end of input')
        if (target.type !== 'text') {
          throw new UserError('Expected redirect target, got ' + target.type)
        }
        command.redirections ??= []
        if (token.mode.startsWith('duplicate-')) {
          if (target.content === '-') {
            command.redirections.push({ fd: token.fd, type: 'close' })
            continue
          }
          if (! /^\d+$/.test(target.content)) {
            throw new UserError(`Expected file descriptor, got ${target.content}`)
          }
          const sourceFd = Number(target.content)
          if (! Number.isSafeInteger(sourceFd)) {
            throw new UserError(`Invalid file descriptor: ${target.content}`)
          }
          command.redirections.push({ fd: token.fd, type: 'duplicate', sourceFd })
        }
        else if (token.mode === 'read') {
          command.redirections.push({
            fd: token.fd,
            type: 'readFrom',
            path: target.content,
          })
        }
        else {
          command.redirections.push({
            fd: token.fd,
            type: token.mode === 'append' ? 'appendTo' : 'writeTo',
            path: target.content,
          })
        }
      }
      else if (token.type === 'text') {
        command.args.push(token.content)
      }
    }

    script.commands.push(command)
  }

  return script
}

export const parseLine = (line: string, env: Env) => parse(expand(tokenize(line), env))
