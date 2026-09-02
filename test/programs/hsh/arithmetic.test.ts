import { describe, expect, it } from 'vitest'
import { expandArithmetic } from '@/programs/hsh/arithmetic'

describe('hsh arithmetic expansion', () => {
  it('evaluates integer expressions with shell precedence', () => {
    expect(expandArithmetic('2 + 3 * 4', {})).toBe('14')
    expect(expandArithmetic('(2 + 3) * 4', {})).toBe('20')
    expect(expandArithmetic('1 << 4 | 3', {})).toBe('19')
  })

  it('reads variables and evaluates comparisons and logical operators', () => {
    expect(expandArithmetic('count + 1', { count: '41' })).toBe('42')
    expect(expandArithmetic('count >= 41 && enabled', {
      count: '41',
      enabled: '1',
    })).toBe('1')
    expect(expandArithmetic('missing + 2', {})).toBe('2')
  })

  it('rejects invalid values and division by zero', () => {
    expect(() => expandArithmetic('value + 1', { value: 'text' }))
      .toThrow('non-integer arithmetic value')
    expect(() => expandArithmetic('1 / 0', {})).toThrow('Division by zero')
    expect(() => expandArithmetic('globalThis', { globalThis: 'not-code' })).toThrow()
  })
})
