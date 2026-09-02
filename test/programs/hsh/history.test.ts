import { describe, expect, it } from 'vitest'
import {
  appendHistoryEntry,
  parseHistoryFile,
  parseHistoryLimit,
} from '@/programs/hsh/history'

describe('hsh history files', () => {
  it('parses numeric history limits with a safe fallback', () => {
    expect(parseHistoryLimit('20', 10)).toBe(20)
    expect(parseHistoryLimit('0', 10)).toBe(0)
    expect(parseHistoryLimit('-1', 10)).toBe(10)
    expect(parseHistoryLimit('invalid', 10)).toBe(10)
  })

  it('parses files with or without a final newline', () => {
    expect(parseHistoryFile('one\ntwo\n')).toEqual(['one', 'two'])
    expect(parseHistoryFile('one\ntwo')).toEqual(['one', 'two'])
  })

  it('retains at most SAVEHIST entries', () => {
    expect(appendHistoryEntry('one\ntwo\n', 'three', 2)).toBe('two\nthree\n')
    expect(appendHistoryEntry('one\n', 'two', 0)).toBe('')
  })
})
