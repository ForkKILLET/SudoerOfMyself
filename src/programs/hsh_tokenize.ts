import { wrapProgram } from '@/sys0/program'
import { tokenize } from './hsh/parse'

export const hsh_tokenize = wrapProgram((proc, _, ...args) => {
    const { stdio, ctx, env } = proc

    const raw = args.join(' ')
    const tokens = tokenize(raw, env, false)

    stdio.writeLn(raw)
    const tokenLine = Array.replicate(ctx.term.getStringWidth(raw), ' ')
    tokens.forEach(({ begin, end }) => {
        if (begin === end) {
            tokenLine[begin] = '┴'
        }
        else {
            tokenLine[begin] = '└'
            for (let i = begin + 1; i < end; i ++) {
                tokenLine[i] = '─'
            }
            tokenLine[end] = '┘'
        }
    })
    stdio.writeLn(tokenLine.join(''))

    return 0
})