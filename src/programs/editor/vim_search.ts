import { UserError } from '@/utils/errors'
import type { TextRange } from './text_buffer'

export interface VimMatch { start: number, end: number }

// Use the host's Unicode regular expressions, consistently in search and :s.
export const searchMatches = (content: string, pattern: string): VimMatch[] => (
  Array.from(content.matchAll(new RegExp(pattern, 'gmu')), match => ({
    start: match.index, end: match.index + match[0].length,
  })).filter(match => ! content.endsWith('\n') || match.start < content.length)
)

export const nextMatch = (matches: VimMatch[], offset: number, direction: number, count: number) => {
  if (! matches.length) return null
  const index = direction === 1
    ? matches.findIndex(match => match.start > offset)
    : matches.reduce((last, match, index) => match.start < offset ? index : last, - 1)
  const first = index === - 1 ? direction === 1 ? 0 : matches.length - 1 : index
  const raw = first + direction * (count - 1)
  const selected = ((raw % matches.length) + matches.length) % matches.length
  return { match: matches[selected], wrapped: index === - 1 || raw < 0 || raw >= matches.length }
}

export const searchRanges = (content: string, pattern: string): TextRange[] => {
  const starts = [0]
  for (let index = 0; index < content.length; index ++) if (content[index] === '\n') starts.push(index + 1)
  const position = (offset: number) => {
    let low = 0
    let high = starts.length
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2)
      if (starts[middle] <= offset) low = middle
      else high = middle
    }
    return { row: low, column: offset - starts[low] }
  }
  return searchMatches(content, pattern).map(match => ({ start: position(match.start), end: position(match.end) }))
}

export interface Substitution {
  first: number
  last: number
  pattern: string
  replacement: string
  global: boolean
  ignoreCase: boolean
}

export const parseSubstitution = (
  command: string, row: number, lineCount: number, previousPattern: string,
): Substitution | null => {
  const prefix = /^(%|(?:\d+|\.|\$)(?:,(?:\d+|\.|\$))?)?s([^\w\s\\])/u.exec(command)
  if (! prefix) return null
  const delimiter = prefix[2]
  let index = prefix[0].length
  const field = (required: boolean) => {
    let value = ''
    while (index < command.length) {
      const char = command[index ++]
      if (char === delimiter) return value
      if (char === '\\' && index < command.length) {
        const next = command[index ++]
        value += next === delimiter ? delimiter : '\\' + next
      }
      else value += char
    }
    if (required) throw new UserError('Missing substitute delimiter')
    return value
  }
  const pattern = field(true) || previousPattern
  if (! pattern) throw new UserError('No previous search pattern')
  const replacement = field(false)
  const flags = command.slice(index)
  if (! /^[gi]*$/u.test(flags)) throw new UserError('Supported substitute flags: g, i')
  const address = (value: string) => value === '.' ? row : value === '$' ? lineCount - 1 : Number(value) - 1
  const range = prefix[1]
  const [first, last] = range === '%' ? [0, lineCount - 1] : range
    ? range.split(',').map(address) : [row, row]
  const end = last ?? first
  if (first < 0 || end >= lineCount || first > end) throw new UserError('Invalid substitute range')
  return { first, last: end, pattern, replacement, global: flags.includes('g'), ignoreCase: flags.includes('i') }
}

export const substituteLines = (lines: string[], command: Substitution) => {
  const regex = new RegExp(command.pattern, `u${command.global ? 'g' : ''}${command.ignoreCase ? 'i' : ''}`)
  let count = 0
  let lastRow = command.first
  const replacement = (match: string, groups: string[]) => command.replacement.replace(
    /\\([\s\S])|&/gu,
    (token, escaped: string | undefined) => {
      if (token === '&' || escaped === '0') return match
      if (escaped && /^[1-9]$/u.test(escaped)) return groups[Number(escaped) - 1] ?? ''
      if (escaped === 'r') return '\n'
      return escaped ?? token
    },
  )
  const changed = lines.map((line, row) => {
    if (row < command.first || row > command.last) return line
    return line.replace(regex, (match: string, ...args: unknown[]) => {
      count ++
      lastRow = row
      const captures = args.slice(0, typeof args.at(- 1) === 'object' ? - 3 : - 2)
      return replacement(match, captures.map(value => typeof value === 'string' ? value : ''))
    })
  })
  return { content: changed.join('\n'), count, lastRow }
}
