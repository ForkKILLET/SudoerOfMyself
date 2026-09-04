import { describe, expect, it } from 'vitest'
import {
  IncompleteHshScriptError,
  parseControlScript,
} from '@/programs/hsh/script'

describe('hsh control-flow parser', () => {
  it('rejects reserved words outside their grammar position', () => {
    expect(() => parseControlScript('in value')).toThrow('Unexpected \'in\'')
    expect(() => parseControlScript('then echo value')).toThrow('Unexpected \'then\'')
  })

  it('parses double-bracket expressions as one conditional statement', () => {
    expect(parseControlScript('[[ "$VALUE" == "hello world" && 4 -gt 2 ]] && echo yes'))
      .toMatchObject({
        entries: [
          { condition: 'always', statement: { type: 'conditional' } },
          { condition: 'success', statement: { type: 'simple', source: 'echo yes' } },
        ],
      })
  })

  it('keeps double-bracket input incomplete until the closing word', () => {
    expect(() => parseControlScript('[[ value == value'))
      .toThrow(IncompleteHshScriptError)
    expect(() => parseControlScript('[[ value == value\n'))
      .toThrow('Expected \']]\'')
  })

  it('parses command lists and logical connectors without expanding command text', () => {
    expect(parseControlScript('first $VALUE; second && third || fourth')).toEqual({
      entries: [
        { condition: 'always', statement: { type: 'simple', source: 'first $VALUE' } },
        { condition: 'always', statement: { type: 'simple', source: 'second' } },
        { condition: 'success', statement: { type: 'simple', source: 'third' } },
        { condition: 'failure', statement: { type: 'simple', source: 'fourth' } },
      ],
    })
  })

  it('marks time as a statement modifier', () => {
    expect(parseControlScript('time first | second; time for i in a; do work; done'))
      .toMatchObject({
        entries: [
          {
            timed: true,
            statement: {
              type: 'pipeline',
              stages: [
                { type: 'simple', source: 'first' },
                { type: 'simple', source: 'second' },
              ],
            },
          },
          {
            timed: true,
            statement: { type: 'for' },
          },
        ],
      })
    expect(() => parseControlScript('time')).toThrow(IncompleteHshScriptError)
  })

  it('parses nested if, loop, and for statements', () => {
    const script = parseControlScript(`
      if ready; then
        while keep-going; do tick; done
      elif fallback; then
        until finished; do wait; done
      else
        for item in one "$TWO"; do echo $item; done
      fi
    `)

    const statement = script.entries[0]?.statement
    expect(statement?.type).toBe('if')
    if (statement?.type !== 'if') return
    expect(statement.branches).toHaveLength(2)
    expect(statement.branches[0].body.entries[0]?.statement.type).toBe('while')
    expect(statement.branches[1].body.entries[0]?.statement.type).toBe('until')
    expect(statement.elseBody?.entries[0]?.statement).toMatchObject({
      type: 'for',
      name: 'item',
      wordsSource: 'one "$TWO"',
    })
  })

  it('parses subshell and current-shell groups without requiring spaces around parentheses', () => {
    const script = parseControlScript('(first; second) || { third; fourth; }')

    expect(script.entries).toMatchObject([
      {
        condition: 'always',
        statement: {
          type: 'group',
          mode: 'subshell',
          body: {
            entries: [
              { statement: { type: 'simple', source: 'first' } },
              { statement: { type: 'simple', source: 'second' } },
            ],
          },
        },
      },
      {
        condition: 'failure',
        statement: {
          type: 'group',
          mode: 'current',
          body: {
            entries: [
              { statement: { type: 'simple', source: 'third' } },
              { statement: { type: 'simple', source: 'fourth' } },
            ],
          },
        },
      },
    ])
  })

  it('composes compound commands with pipelines and trailing redirections', () => {
    const script = parseControlScript('(first) | { second; } > output.txt')

    expect(script.entries[0]?.statement).toMatchObject({
      type: 'pipeline',
      stages: [
        { type: 'group', mode: 'subshell' },
        {
          type: 'redirected',
          source: '> output.txt',
          statement: { type: 'group', mode: 'current' },
        },
      ],
    })
  })

  it('parses POSIX-style function definitions with compound bodies', () => {
    const script = parseControlScript('greet() { echo "$1"; return 3; }')

    expect(script.entries[0]?.statement).toMatchObject({
      type: 'functionDefinition',
      name: 'greet',
      body: {
        type: 'group',
        mode: 'current',
        body: {
          entries: [
            { statement: { type: 'simple', source: 'echo "$1"' } },
            { statement: { type: 'simple', source: 'return 3' } },
          ],
        },
      },
    })
  })

  it('parses function-keyword definitions with optional parentheses', () => {
    const script = parseControlScript(`
      function first { echo one; }
      function second() (echo two)
    `)

    expect(script.entries.map(({ statement }) => statement)).toMatchObject([
      { type: 'functionDefinition', name: 'first', body: { mode: 'current' } },
      { type: 'functionDefinition', name: 'second', body: { mode: 'subshell' } },
    ])
  })

  it('preserves background markers and redirection duplication in simple commands', () => {
    expect(parseControlScript('producer 2>&1 & consumer')).toEqual({
      entries: [
        { condition: 'always', statement: { type: 'simple', source: 'producer 2>&1 &' } },
        { condition: 'always', statement: { type: 'simple', source: 'consumer' } },
      ],
    })
  })

  it('marks compound statements for background execution', () => {
    const script = parseControlScript('if ready; then work; fi & after')

    expect(script.entries[0]).toMatchObject({
      condition: 'always',
      background: true,
      source: 'if ready; then work; fi',
      statement: { type: 'if' },
    })
    expect(script.entries[1]).toEqual({
      condition: 'always',
      statement: { type: 'simple', source: 'after' },
    })
  })

  it('reports unfinished compounds separately from invalid completed syntax', () => {
    expect(() => parseControlScript('if')).toThrow(IncompleteHshScriptError)
    expect(() => parseControlScript('if ready; then echo yes'))
      .toThrow(IncompleteHshScriptError)
    expect(() => parseControlScript('if ready; then')).toThrow(IncompleteHshScriptError)
    expect(() => parseControlScript('if ready; then echo yes; else'))
      .toThrow(IncompleteHshScriptError)
    expect(() => parseControlScript('while')).toThrow(IncompleteHshScriptError)
    expect(() => parseControlScript('while ready; do')).toThrow(IncompleteHshScriptError)
    expect(() => parseControlScript('echo "unfinished'))
      .toThrow(IncompleteHshScriptError)
    expect(() => parseControlScript('then echo nope'))
      .toThrow(`Unexpected 'then'`)
    expect(() => parseControlScript('& echo nope')).toThrow('Unexpected token: &')
    expect(() => parseControlScript('echo yes && & echo nope')).toThrow('Unexpected token: &')
    expect(() => parseControlScript('echo yes;; echo nope')).toThrow('Unexpected token: ;')
    expect(() => parseControlScript('if ready; then fi')).toThrow('Expected command after then')
    expect(() => parseControlScript('while ready; do done')).toThrow('Expected command after do')
    expect(() => parseControlScript('(echo yes')).toThrow(IncompleteHshScriptError)
    expect(() => parseControlScript('{ echo yes;')).toThrow(IncompleteHshScriptError)
    expect(() => parseControlScript('greet()')).toThrow(IncompleteHshScriptError)
    expect(() => parseControlScript('function')).toThrow(IncompleteHshScriptError)
    expect(() => parseControlScript('greet() echo yes'))
      .toThrow('Function body must be a compound command')
    expect(() => parseControlScript('( )')).toThrow('Expected command after (')
    expect(() => parseControlScript('{ }')).toThrow('Expected command after {')
    expect(() => parseControlScript('(echo yes) |')).toThrow(IncompleteHshScriptError)
  })
})
