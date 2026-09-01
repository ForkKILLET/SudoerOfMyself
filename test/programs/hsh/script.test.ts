import { describe, expect, it } from 'vitest'
import {
  IncompleteHshScriptError,
  parseControlScript,
} from '@/programs/hsh/script'

describe('hsh control-flow parser', () => {
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

  it('preserves background markers and redirection duplication in simple commands', () => {
    expect(parseControlScript('producer 2>&1 & consumer')).toEqual({
      entries: [
        { condition: 'always', statement: { type: 'simple', source: 'producer 2>&1 &' } },
        { condition: 'always', statement: { type: 'simple', source: 'consumer' } },
      ],
    })
  })

  it('reports unfinished compounds separately from invalid completed syntax', () => {
    expect(() => parseControlScript('if ready; then echo yes'))
      .toThrow(IncompleteHshScriptError)
    expect(() => parseControlScript('echo "unfinished'))
      .toThrow(IncompleteHshScriptError)
    expect(() => parseControlScript('then echo nope'))
      .toThrow(`Unexpected 'then'`)
    expect(() => parseControlScript('& echo nope')).toThrow('Unexpected token: &')
    expect(() => parseControlScript('echo yes && & echo nope')).toThrow('Unexpected token: &')
    expect(() => parseControlScript('echo yes;; echo nope')).toThrow('Unexpected token: ;')
    expect(() => parseControlScript('if ready; then fi')).toThrow('Expected command after then')
    expect(() => parseControlScript('while ready; do done')).toThrow('Expected command after do')
  })
})
