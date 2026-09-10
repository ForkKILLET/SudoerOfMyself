import { UserError } from '@/utils/errors'

export const VIM_DEFAULT_OPTIONS = { number: false, hlsearch: true, wrap: true, cursorline: true }
export type VimOptions = typeof VIM_DEFAULT_OPTIONS
type OptionName = keyof VimOptions
const aliases: Record<string, OptionName> = {
  number: 'number', nu: 'number', hlsearch: 'hlsearch', hls: 'hlsearch', wrap: 'wrap',
  cursorline: 'cursorline', cul: 'cursorline',
}
const display = (options: VimOptions, key: OptionName) => (options[key] ? '' : 'no') + key

export const setVimOptions = (options: VimOptions, arguments_: string) => {
  const next = { ...options }
  const messages: string[] = []
  const tokens = arguments_.trim().split(/\s+/u).filter(Boolean)
  if (! tokens.length) tokens.push('all')
  for (const token of tokens) {
    if (token === 'all') {
      messages.push(...Object.keys(next).map(key => display(next, key as OptionName)))
      continue
    }
    const match = /^(no|inv)?([a-z]+)([?!&])?$/u.exec(token)
    const name = match?.[2] ?? ''
    const key = Object.hasOwn(aliases, name) ? aliases[name] : undefined
    if (! match || ! key || (match[1] && match[3])) throw new UserError(`Unknown option: ${token}`)
    if (match[3] === '?') messages.push(display(next, key))
    else if (match[3] === '&') next[key] = VIM_DEFAULT_OPTIONS[key]
    else if (match[3] === '!' || match[1] === 'inv') next[key] = ! next[key]
    else next[key] = match[1] !== 'no'
  }
  Object.assign(options, next)
  return messages.join('  ')
}
