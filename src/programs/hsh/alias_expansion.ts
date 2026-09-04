import type { ShellAliases } from '@/sys0/alias'
import { parseEnvAssignment, tokenize, type HshToken } from './parse'

type ControlToken = Extract<HshToken, { type: 'redirect' | 'pipe' | 'background' }>
type WordToken = Exclude<HshToken, ControlToken>

interface WordEntry {
  type: 'word'
  begin: number
  end: number
  tokens: WordToken[]
}

type ExpansionEntry = WordEntry | ControlToken

const entriesFor = (source: string): ExpansionEntry[] => {
  const tokens = tokenize(source)
  const words = new Map<number, WordToken[]>()
  const controls: ControlToken[] = []
  tokens.forEach((token) => {
    if (token.type === 'redirect' || token.type === 'pipe' || token.type === 'background') {
      controls.push(token)
      return
    }
    const word = words.get(token.word) ?? []
    word.push(token)
    words.set(token.word, word)
  })
  const wordEntries = [...words.values()].map((tokens): WordEntry => ({
    type: 'word',
    begin: Math.min(...tokens.map(token => token.begin)),
    end: Math.max(...tokens.map(token => token.end)),
    tokens,
  }))
  return [...controls, ...wordEntries].sort((left, right) => left.begin - right.begin)
}

interface Replacement {
  begin: number
  end: number
  value: string
}

export const expandAliases = (
  source: string,
  aliases: ShellAliases,
  active: ReadonlySet<string> = new Set(),
) => {
  const replacements: Replacement[] = []
  let commandPosition = true
  let redirectTarget = false
  let nextWordEligible = false

  for (const entry of entriesFor(source)) {
    if (entry.type === 'pipe' || entry.type === 'background') {
      commandPosition = true
      redirectTarget = false
      nextWordEligible = false
      continue
    }
    if (entry.type === 'redirect') {
      redirectTarget = true
      continue
    }
    if (redirectTarget) {
      redirectTarget = false
      continue
    }

    const raw = source.slice(entry.begin, entry.end)
    if (commandPosition && parseEnvAssignment(raw)) continue
    if (! commandPosition && ! nextWordEligible) continue

    const [token] = entry.tokens
    const isPlainWord = entry.tokens.length === 1
      && token.type === 'text'
      && ! token.isDq
      && ! token.isSq
      && ! token.isBraceLiteral
      && ! token.isPatternLiteral
      && raw === token.content
    const value = isPlainWord ? aliases.get(token.content) : undefined
    if (value !== undefined && ! active.has(token.content)) {
      replacements.push({
        begin: entry.begin,
        end: entry.end,
        value: expandAliases(value, aliases, new Set(active).add(token.content)),
      })
      nextWordEligible = value === '' || /\s$/u.test(value)
    }
    else nextWordEligible = false
    commandPosition = false
  }

  return replacements.reduceRight(
    (expanded, replacement) => (
      expanded.slice(0, replacement.begin) + replacement.value + expanded.slice(replacement.end)
    ),
    source,
  )
}
