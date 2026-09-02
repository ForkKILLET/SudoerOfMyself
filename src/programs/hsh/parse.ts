import { createEnv, Env, getEnv, isEnvName } from '@/sys0/env'
import { UserError } from '@/utils/errors'
import { expandArithmetic } from './arithmetic'

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
  | HshTokenParameter
  | HshTokenCommandSubstitution
  | HshTokenArithmetic
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
  isDq?: boolean
}

export interface HshTokenParameter extends HshTokenBase {
  type: 'parameter'
  isDq?: boolean
}

export interface HshTokenCommandSubstitution extends HshTokenBase {
  type: 'commandSubstitution'
  isDq?: boolean
}

export interface HshTokenArithmetic extends HshTokenBase {
  type: 'arithmetic'
  isDq?: boolean
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

const findParameterEnd = (line: string, openIndex: number) => {
  let depth = 1
  let isEscaped = false
  let isSingleQuoted = false
  let isDoubleQuoted = false
  for (let index = openIndex + 1; index < line.length; index ++) {
    const char = line[index]
    if (isEscaped) {
      isEscaped = false
      continue
    }
    if (char === '\\' && ! isSingleQuoted) {
      isEscaped = true
      continue
    }
    if (char === '\'' && ! isDoubleQuoted) {
      isSingleQuoted = ! isSingleQuoted
      continue
    }
    if (char === '"' && ! isSingleQuoted) {
      isDoubleQuoted = ! isDoubleQuoted
      continue
    }
    if (isSingleQuoted || isDoubleQuoted) continue
    if (char === '{') depth ++
    else if (char === '}' && -- depth === 0) return index
  }
  return - 1
}

export const findShellParenthesisEnd = (line: string, openIndex: number) => {
  let depth = 1
  let isEscaped = false
  let isSingleQuoted = false
  let isDoubleQuoted = false
  for (let index = openIndex + 1; index < line.length; index ++) {
    const char = line[index]
    if (isEscaped) {
      isEscaped = false
      continue
    }
    if (char === '\\' && ! isSingleQuoted) {
      isEscaped = true
      continue
    }
    if (char === '\'' && ! isDoubleQuoted) {
      isSingleQuoted = ! isSingleQuoted
      continue
    }
    if (char === '"' && ! isSingleQuoted) {
      isDoubleQuoted = ! isDoubleQuoted
      continue
    }
    if (isSingleQuoted || isDoubleQuoted) continue
    if (char === '(') depth ++
    else if (char === ')' && -- depth === 0) return index
  }
  return - 1
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
            isDq,
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
            isDq,
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
    else if (! isSq && ch === '$' && line[i] === '(') {
      consumeNow()
      const end = findShellParenthesisEnd(line, i)
      if (end === - 1) {
        if (isStrict) throw new UserError('Unmatched command or arithmetic expansion')
        now += line.slice(i - 1)
        break
      }
      const isArithmetic = line[i + 1] === '(' && line[end - 1] === ')'
      tokens.push({
        type: isArithmetic ? 'arithmetic' : 'commandSubstitution',
        content: isArithmetic
          ? line.slice(i + 2, end - 1)
          : line.slice(i + 1, end),
        begin: i - 1,
        end,
        isDq,
      })
      i = end + 1
      begin = i
    }
    else if (! isSq && ch === '$' && line[i] === '{') {
      consumeNow()
      const end = findParameterEnd(line, i)
      if (end === - 1) {
        if (isStrict) throw new UserError('Unmatched parameter expansion')
        now += line.slice(i - 1)
        break
      }
      tokens.push({
        type: 'parameter',
        content: line.slice(i - 1, end + 1),
        begin: i - 1,
        end,
        isDq,
      })
      i = end + 1
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

const areWordTokensAdjacent = (previous: HshToken, next: HshToken) => (
  previous.end + 1 === next.begin
  || (
    (previous.type === 'variable' || previous.type === 'parameter')
    && previous.isDq
    && previous.end + 2 === next.begin
  )
)

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
    if (previous && ! areWordTokensAdjacent(previous, token)) flushWord()
    word.push(token)
  }
  flushWord()
  return expanded
}

export interface HshExpansionOptions {
  assignVariable?: (name: string, value: string) => void
  fieldSplitting?: boolean
  commandResults?: ReadonlyMap<number, string>
}

const PARAMETER_NAME = /^([A-Za-z_][A-Za-z0-9_]*|[0-9]+|[?!$#*@_-])(.*)$/s
const PARAMETER_OPERATOR = /^(:[-=+?]|[-=+?])(.*)$/s

const expandParameter = (
  expression: string,
  env: Env,
  options: HshExpansionOptions,
): string => {
  if (expression.startsWith('#') && expression.length > 1) {
    const lengthName = expression.slice(1)
    if (! PARAMETER_NAME.test(lengthName) || PARAMETER_NAME.exec(lengthName)?.[2]) {
      throw new UserError(`Bad substitution: \${${expression}}`)
    }
    return Array.from(getEnv(env, lengthName)).length.toString()
  }

  const parameter = PARAMETER_NAME.exec(expression)
  if (! parameter) throw new UserError(`Bad substitution: \${${expression}}`)
  const [, name, remainder] = parameter
  if (! remainder) return getEnv(env, name)

  const operation = PARAMETER_OPERATOR.exec(remainder)
  if (! operation) throw new UserError(`Bad substitution: \${${expression}}`)
  const [, operator, word] = operation
  const isSet = Object.hasOwn(env, name)
  const value = getEnv(env, name)
  const useNull = operator.startsWith(':')
  const isMissing = ! isSet || (useNull && value === '')
  const action = operator.at(- 1)
  const expandedWord = () => expand(tokenize(word), env, options)
    .map(token => token.content)
    .join(' ')

  switch (action) {
    case '-': return isMissing ? expandedWord() : value
    case '+': return isMissing ? '' : expandedWord()
    case '=': {
      if (! isMissing) return value
      if (! isEnvName(name)) throw new UserError(`Cannot assign to parameter: ${name}`)
      const assigned = expandedWord()
      if (options.assignVariable) options.assignVariable(name, assigned)
      else env[name] = assigned
      return assigned
    }
    case '?': {
      if (! isMissing) return value
      throw new UserError(expandedWord() || `${name}: parameter null or not set`)
    }
  }
  throw new UserError(`Bad substitution: \${${expression}}`)
}

export const expand = (
  tokens: HshToken[],
  env: Env,
  options: HshExpansionOptions = {},
): HshExpandedToken[] => {
  const expanded: HshExpandedToken[] = []

  const ifs = Object.hasOwn(env, 'IFS') ? env.IFS : ' \t\n'
  const positional = () => {
    const count = Number.parseInt(getEnv(env, '#'), 10)
    if (! Number.isSafeInteger(count) || count <= 0) return []
    return Array.from({ length: count }, (_, index) => getEnv(env, String(index + 1)))
  }
  const escapeCharacterClass = (value: string) => value.replace(/[\\\]^\-]/g, '\\$&')
  const splitFields = (value: string) => {
    if (! value) return []
    if (options.fieldSplitting === false || ! ifs) return [value]
    const chars = [...new Set(Array.from(ifs))]
    const whitespace = chars.filter(char => /\s/u.test(char)).join('')
    const separators = chars.filter(char => ! /\s/u.test(char)).join('')
    if (! separators) {
      const pattern = new RegExp(`[${escapeCharacterClass(whitespace)}]+`, 'u')
      return value.split(pattern).filter(Boolean)
    }
    const whitespaceClass = escapeCharacterClass(whitespace)
    const separatorClass = escapeCharacterClass(separators)
    let normalized = value
    if (whitespace) {
      normalized = normalized
        .replace(new RegExp(`[${whitespaceClass}]*([${separatorClass}])[${whitespaceClass}]*`, 'gu'), '$1')
        .replace(new RegExp(`^[${whitespaceClass}]+|[${whitespaceClass}]+$`, 'gu'), '')
    }
    const delimiter = whitespace
      ? new RegExp(`[${separatorClass}]|[${whitespaceClass}]+`, 'u')
      : new RegExp(`[${separatorClass}]`, 'u')
    return normalized.split(delimiter)
  }
  const expandWord = (word: HshToken[]) => {
    const fields = ['']
    let exists = false
    const append = (parts: string[], force = false) => {
      if (! parts.length) {
        if (force) exists = true
        return
      }
      fields[fields.length - 1] += parts[0]
      fields.push(...parts.slice(1))
      exists = true
    }
    const appendScalar = (value: string, quoted: boolean) => {
      append(quoted || options.fieldSplitting === false ? [value] : splitFields(value), quoted)
    }
    const appendPositional = (values: string[], quoted: boolean) => {
      if (quoted) append(values, values.length > 0)
      else append(values.flatMap(splitFields))
    }

    word.forEach((token) => {
      switch (token.type) {
        case 'text':
          append([token.content], true)
          break
        case 'home':
          append([env.HOME], true)
          break
        case 'variable': {
          const name = token.content.slice(1)
          if (name === '@') appendPositional(positional(), Boolean(token.isDq))
          else if (name === '*') {
            appendScalar(positional().join(Array.from(ifs)[0] ?? ''), Boolean(token.isDq))
          }
          else appendScalar(getEnv(env, name), Boolean(token.isDq))
          break
        }
        case 'parameter': {
          const expression = token.content.slice(2, - 1)
          if (expression === '@') appendPositional(positional(), Boolean(token.isDq))
          else if (expression === '*') {
            appendScalar(positional().join(Array.from(ifs)[0] ?? ''), Boolean(token.isDq))
          }
          else appendScalar(expandParameter(expression, env, options), Boolean(token.isDq))
          break
        }
        case 'commandSubstitution': {
          const result = options.commandResults?.get(token.begin)
          if (result === undefined) {
            throw new UserError('Command substitution requires asynchronous shell expansion')
          }
          appendScalar(result, Boolean(token.isDq))
          break
        }
        case 'arithmetic':
          appendScalar(expandArithmetic(token.content, env), Boolean(token.isDq))
          break
      }
    })
    return exists ? fields : []
  }

  splitTokenWords(expandBraces(tokens)).forEach((group) => {
    if (! Array.isArray(group)) {
      expanded.push(group)
      return
    }
    const begin = group[0]?.begin ?? 0
    const end = group.at(- 1)?.end ?? begin
    expanded.push(...expandWord(group).map((content): HshExpandedTokenText => ({
      type: 'text',
      content,
      begin,
      end,
    })))
  })

  return expanded
}

const isControlToken = (
  token: HshToken,
): token is HshTokenRedirect | HshTokenPipe | HshTokenBackground => (
  token.type === 'redirect' || token.type === 'pipe' || token.type === 'background'
)

const splitTokenWords = (tokens: HshToken[]) => {
  const groups: Array<HshToken[] | HshTokenRedirect | HshTokenPipe | HshTokenBackground> = []
  let word: HshToken[] = []
  const flushWord = () => {
    if (word.length) groups.push(word)
    word = []
  }
  tokens.forEach((token) => {
    if (isControlToken(token)) {
      flushWord()
      groups.push(token)
      return
    }
    if (word.length && ! areWordTokensAdjacent(word.at(- 1) !, token)) flushWord()
    word.push(token)
  })
  flushWord()
  return groups
}

const looksLikeAssignmentWord = (tokens: HshToken[]) => (
  parseEnvAssignment(tokens.map(token => token.content).join('')) !== null
)

const expandCommandLine = (
  tokens: HshToken[],
  env: Env,
  options: HshExpansionOptions,
) => {
  const expanded: HshExpandedToken[] = []
  let isCommandPrefix = true
  let assignmentEnv = createEnv(env)

  splitTokenWords(tokens).forEach((group) => {
    if (! Array.isArray(group)) {
      expanded.push(group)
      if (group.type === 'pipe') {
        isCommandPrefix = true
        assignmentEnv = createEnv(env)
      }
      return
    }

    if (isCommandPrefix && looksLikeAssignmentWord(group)) {
      const assignmentTokens = expand(group, assignmentEnv, {
        fieldSplitting: false,
        assignVariable: (name, value) => {
          assignmentEnv[name] = value
          if (options.assignVariable) options.assignVariable(name, value)
          else env[name] = value
        },
      })
      assignmentTokens.forEach((token) => {
        if (token.type !== 'text') return
        const assignment = parseEnvAssignment(token.content)
        if (assignment) assignmentEnv[assignment.name] = assignment.value
      })
      expanded.push(...assignmentTokens)
      return
    }

    isCommandPrefix = false
    expanded.push(...expand(group, env, options))
  })

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

export const parseLine = (
  line: string,
  env: Env,
  options: HshExpansionOptions = {},
) => parse(expandCommandLine(tokenize(line), env, options))

export interface HshAsyncExpansionOptions extends HshExpansionOptions {
  substituteCommand: (source: string) => Promise<string>
}

export const parseLineAsync = async (
  line: string,
  env: Env,
  options: HshAsyncExpansionOptions,
) => {
  const tokens = tokenize(line)
  const commandResults = new Map<number, string>()
  for (const token of tokens) {
    if (token.type !== 'commandSubstitution') continue
    commandResults.set(token.begin, await options.substituteCommand(token.content))
  }
  return parse(expandCommandLine(tokens, env, { ...options, commandResults }))
}
