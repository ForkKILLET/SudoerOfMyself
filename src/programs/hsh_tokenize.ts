import { wrapProgram } from '@/sys0/program'
import { replicate } from '@/utils'
import { type HshToken, tokenize } from './hsh/parse'

export const formatTokenRows = (tokens: readonly HshToken[]) => {
  const typeWidth = Math.max(...tokens.map(token => token.type.length), 4)
  const offsetWidth = Math.max(
    ...tokens.flatMap(token => [token.begin, token.end]).map(offset => String(offset).length),
    1,
  )

  return tokens.map((token) => {
    const type = token.type.padEnd(typeWidth)
    const begin = String(token.begin).padStart(offsetWidth)
    const end = String(token.end).padStart(offsetWidth)
    const quote = 'isSq' in token && token.isSq
      ? '[sq]'
      : 'isDq' in token && token.isDq ? '[dq]' : ''
    return `[${type}] [${begin}, ${end}) ${quote.padEnd(4)} \x1B[34m${JSON.stringify(token.content)}\x1B[0m`
  })
}

export const hsh_tokenize = wrapProgram((proc, _, ...args) => {
  const { stdio, ctx } = proc

  const raw = args.join(' ')
  const tokens = tokenize(raw, false)

  stdio.writeLn(raw)
  const tokenLine = replicate(ctx.term.getStringWidth(raw), ' ')
  tokens.forEach(({ begin, end }) => {
    const beginColumn = ctx.term.getStringWidth(raw.slice(0, begin))
    const endColumn = ctx.term.getStringWidth(raw.slice(0, end))
    const width = endColumn - beginColumn
    if (width <= 0) return
    if (width === 1) {
      tokenLine[beginColumn] = '┴'
    }
    else {
      tokenLine[beginColumn] = '└'
      for (let column = beginColumn + 1; column < endColumn - 1; column ++) {
        tokenLine[column] = '─'
      }
      tokenLine[endColumn - 1] = '┘'
    }
  })
  stdio.writeLn(tokenLine.join(''))
  stdio.writeLn(formatTokenRows(tokens).join('\n'))

  return 0
})
