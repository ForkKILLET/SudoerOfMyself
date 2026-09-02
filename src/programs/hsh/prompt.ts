import type { Env } from '@/sys0/env'

export interface PromptRenderContext {
  env: Env
  jobs?: number
  historyNumber?: number
  commandNumber?: number
  now?: Date
}

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_LONG = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
]
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

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

const formatStrftime = (format: string, date: Date) => format.replace(
  /%[%aAbBdeHImMpSyY]/g,
  (sequence) => {
    switch (sequence) {
      case '%%': return '%'
      case '%a': return WEEKDAYS_SHORT[date.getDay()]
      case '%A': return WEEKDAYS_LONG[date.getDay()]
      case '%b': return MONTHS_SHORT[date.getMonth()]
      case '%B': return MONTHS_LONG[date.getMonth()]
      case '%d': return pad2(date.getDate())
      case '%e': return date.getDate().toString().padStart(2, ' ')
      case '%H': return pad2(date.getHours())
      case '%I': return pad2(date.getHours() % 12 || 12)
      case '%m': return pad2(date.getMonth() + 1)
      case '%M': return pad2(date.getMinutes())
      case '%p': return date.getHours() < 12 ? 'AM' : 'PM'
      case '%S': return pad2(date.getSeconds())
      case '%y': return pad2(date.getFullYear() % 100)
      case '%Y': return date.getFullYear().toString()
      default: return sequence
    }
  },
)

export const renderPrompt = (
  source: string,
  {
    env,
    jobs = 0,
    historyNumber = 1,
    commandNumber = 1,
    now = new Date(),
  }: PromptRenderContext,
) => {
  const cwd = abbreviateHome(env.PWD ?? '/', env.HOME ?? '')
  const hostname = env.HOSTNAME ?? ''
  const username = env.USER ?? env.LOGNAME ?? ''
  const shellName = basename(env['0'] ?? 'hsh')
  const hour12 = now.getHours() % 12 || 12
  const escapes: Record<string, () => string> = {
    'a': () => '\x07',
    'd': () => `${WEEKDAYS_SHORT[now.getDay()]} ${MONTHS_SHORT[now.getMonth()]} ${now.getDate()}`,
    'e': () => '\x1B',
    'h': () => hostname.split('.')[0],
    'H': () => hostname,
    'j': () => jobs.toString(),
    'n': () => '\n',
    'r': () => '\r',
    's': () => shellName,
    't': () => `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`,
    'T': () => `${pad2(hour12)}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`,
    '@': () => `${pad2(hour12)}:${pad2(now.getMinutes())} ${now.getHours() < 12 ? 'am' : 'pm'}`,
    'A': () => `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
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
        rendered += formatStrftime(source.slice(index + 2, end), now)
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
