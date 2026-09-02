import { describe, expect, it } from 'vitest'
import stripAnsi from 'strip-ansi'
import { tokenize } from '@/programs/hsh/parse'
import { formatTokenRows } from '@/programs/hsh_tokenize'

describe('hsh_tokenize', () => {
  it('aligns token types, ranges, quote flags, and contents', () => {
    const rows = formatTokenRows(tokenize('echo "$X" 2>>out $(cmd)')).map(stripAnsi)

    expect(rows).toEqual([
      '[text        ] [ 0,  4)      "echo"',
      '[variable    ] [ 6,  8) [dq] "$X"',
      '[redirect    ] [10, 13)      "2>>"',
      '[text        ] [13, 16)      "out"',
      '[substitution] [17, 23)      "cmd"',
    ])
  })
})
