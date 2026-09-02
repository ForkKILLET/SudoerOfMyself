import type { Env } from '@/sys0/env'
import { formatStrftime, getDateTimeParts } from '@/sys0/time_format'

export interface PromptRenderContext {
  env: Env
  jobs?: number
  historyNumber?: number
  commandNumber?: number
  now?: Date
  timezone?: string
}

const pad2 = (value: number) => value.toString().padStart(2, '0')

const abbreviateHome = (cwd: string, home: string) => {
  if (! home || home === '/') return cwd
  if (cwd === home) return '~'
  if (cwd.startsWith(`${home}/`)) return `~${cwd.slice(home.length)}`
  return cwd
}

const basename = (path: string) => {
  if (path === '/') return '/'
  return path.replace(/\/+$/, '').split('/').at(- 1) ?? path
}

export const renderPrompt = (
  source: string,
  {
    env,
    jobs = 0,
    historyNumber = 1,
    commandNumber = 1,
    now = new Date(),
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  }: PromptRenderContext,
) => {
  const cwd = abbreviateHome(env.PWD ?? '/', env.HOME ?? '')
  const hostname = env.HOSTNAME ?? ''
  const username = env.USER ?? env.LOGNAME ?? ''
  const shellName = basename(env['0'] ?? 'hsh')
  const nowMs = now.getTime()
  const date = getDateTimeParts(nowMs, timezone)
  const hour12 = date.hour % 12 || 12
  const escapes: Record<string, () => string> = {
    'a': () => '\x07',
    'd': () => `${date.weekdayShort} ${date.monthShort} ${date.day}`,
    'e': () => '\x1B',
    'h': () => hostname.split('.')[0],
    'H': () => hostname,
    'j': () => jobs.toString(),
    'n': () => '\n',
    'r': () => '\r',
    's': () => shellName,
    't': () => `${pad2(date.hour)}:${pad2(date.minute)}:${pad2(date.second)}`,
    'T': () => `${pad2(hour12)}:${pad2(date.minute)}:${pad2(date.second)}`,
    '@': () => `${pad2(hour12)}:${pad2(date.minute)} ${date.hour < 12 ? 'am' : 'pm'}`,
    'A': () => `${pad2(date.hour)}:${pad2(date.minute)}`,
    'u': () => username,
    'w': () => cwd,
    'W': () => cwd === '~' ? '~' : basename(cwd),
    '!': () => historyNumber.toString(),
    '#': () => commandNumber.toString(),
    '$': () => username === 'root' ? '#' : '$',
    '\\': () => '\\',
    '[': () => '',
    ']': () => '',
  }
  let rendered = ''

  for (let index = 0; index < source.length; index ++) {
    const char = source[index]
    if (char !== '\\') {
      rendered += char
      continue
    }

    const escape = source[++ index]
    if (escape === undefined) {
      rendered += '\\'
      break
    }
    if (escape === 'D' && source[index + 1] === '{') {
      const end = source.indexOf('}', index + 2)
      if (end !== - 1) {
        rendered += formatStrftime(source.slice(index + 2, end), nowMs, timezone)
        index = end
        continue
      }
    }
    if (/[0-7]/.test(escape)) {
      const octal = source.slice(index, index + 3)
      if (/^[0-7]{3}$/.test(octal)) {
        rendered += String.fromCharCode(Number.parseInt(octal, 8))
        index += 2
        continue
      }
    }

    const renderEscape = escapes[escape]
    rendered += renderEscape ? renderEscape() : `\\${escape}`
  }
  return rendered
}
