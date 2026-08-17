import { Env, getEnv } from '@/sys0/env'
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
  export const senv = [...d10, '?']
  export const env = [...letter, ...d10, '_']
}

export const is = <K extends keyof typeof HSH_CHARS>(kind: K, ch: string) => HSH_CHARS[kind].includes(ch)

export type HshToken =
  | HshTokenText
  | HshTokenVariable
  | HshTokenHome
  | HshTokenRedirect

export type HshExpandedTokenText = Omit<HshTokenText, 'isDq' | 'isSq'>

export type HshExpandedToken =
  | HshExpandedTokenText
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
}

export interface HshTokenVariable extends HshTokenBase {
  type: 'variable'
}

export interface HshTokenHome extends HshTokenBase {
  type: 'home'
}

export interface HshTokenRedirect extends HshTokenBase {
  type: 'redirect'
  mode: 'read' | 'write' | 'append'
}

export const tokenize = (line: string, isStrict = true) => {
  const tokens: HshToken[] = []
  let isEsc = false
  let isNesc = false as false | 'x' | 'u' | 'o'
  let isSq = false
  let isDq = false
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

    if (isEsc && isDq) {
      if (ch === 'x' || ch === 'u' || ch === '0') isNesc = ch === '0' ? 'o' : ch
      else now += ESCAPES[ch] ?? ch
      isEsc = false
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
    if (is('white', ch) && ! isSq && ! isDq) {
      if (! isWh) {
        consumeNow()
        isWh = true
      }
      begin ++
      continue
    }
    else isWh = false
    if (! isDq && ! isSq && (ch === '>' || ch === '<')) {
      consumeNow()
      if (ch === '>' && line[i] === '>') {
        tokens.push({
          type: 'redirect',
          mode: 'append',
          begin,
          end: i,
          content: '>>',
        })
        i ++
      }
      else {
        tokens.push({
          type: 'redirect',
          mode: ch === '<' ? 'read' : 'write',
          begin,
          end: i - 1,
          content: ch,
        })
      }
      begin = i
    }
    else if (ch === '\\' && ! isSq) isEsc = true
    else if (ch === '\'' && ! isDq) {
      if (isSq) {
        consumeNow(0)
        begin = i
      }
      isSq = ! isSq
    }
    else if (ch === '"' && ! isSq) {
      if (isDq) {
        consumeNow(0)
        begin = i
      }
      isDq = ! isDq
    }
    else if (! isDq && ! isSq && ch === '~') {
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

export const expand = (tokens: HshToken[], env: Env): HshExpandedToken[] => {
  const expanded: HshExpandedToken[] = []

  let text: HshExpandedTokenText | null = null
  for (const token of tokens) {
    if (token.type === 'redirect') {
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
}

export interface HshAstCommand {
  name: string
  args: string[]
  input?:
    | { type: 'readFrom', path: string }
  output?:
    | { type: 'writeTo', path: string }
    | { type: 'appendTo', path: string }
}

export const parse = (tokens: HshExpandedToken[]): HshAstScript => {
  const script: HshAstScript = {
    commands: [],
  }

  while (tokens.length) {
    const firstToken = tokens[0]
    const name = firstToken.type === 'redirect' ? 'cat' : firstToken.content
    if (firstToken.type !== 'redirect') tokens.shift()

    const command: HshAstCommand = {
      name,
      args: [],
    }

    while (tokens.length) {
      const token = tokens.shift()
      if (! token) break
      if (token.type === 'redirect') {
        const target = tokens.shift()
        if (! target) throw new UserError('Expected redirect target, got end of input')
        if (target.type !== 'text') {
          throw new UserError('Expected redirect target, got ' + target.type)
        }
        if (token.mode === 'read') {
          command.input = {
            type: 'readFrom',
            path: target.content,
          }
        }
        else {
          command.output = {
            type: `${token.mode}To`,
            path: target.content,
          }
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
