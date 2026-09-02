import { describe, expect, it } from 'vitest'
import { matchesShellPattern, type ShellPatternPart } from '@/programs/shell_pattern'

const active = (value: string): ShellPatternPart => ({ value, literal: false })
const literal = (value: string): ShellPatternPart => ({ value, literal: true })

describe('shell pattern matching', () => {
  it('matches stars, question marks, and character classes', () => {
    expect(matchesShellPattern('foobar', [active('foo*')])).toBe(true)
    expect(matchesShellPattern('foo', [active('f?o')])).toBe(true)
    expect(matchesShellPattern('f🙂o', [active('f?o')])).toBe(true)
    expect(matchesShellPattern('b', [active('[a-c]')])).toBe(true)
    expect(matchesShellPattern('d', [active('[!a-c]')])).toBe(true)
    expect(matchesShellPattern('b', [active('[!a-c]')])).toBe(false)
    expect(matchesShellPattern('-', [active('[z-a]')])).toBe(true)
  })

  it('treats quoted pattern fragments literally', () => {
    expect(matchesShellPattern('foo*', [literal('foo*')])).toBe(true)
    expect(matchesShellPattern('foobar', [literal('foo*')])).toBe(false)
    expect(matchesShellPattern('foo*bar', [active('foo'), literal('*'), active('bar')]))
      .toBe(true)
  })
})
