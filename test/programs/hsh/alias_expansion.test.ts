import { describe, expect, it } from 'vitest'
import { ShellAliases } from '@/sys0/alias'
import { expandAliases } from '@/programs/hsh/alias_expansion'

const aliases = (...entries: Array<[string, string]>) => new ShellAliases(entries)

describe('shell alias expansion', () => {
  it('expands command words after assignments, redirects, and pipes', () => {
    const table = aliases(['ll', 'ls -l'])

    expect(expandAliases('A=1 >out ll file | ll', table)).toBe(
      'A=1 >out ls -l file | ls -l',
    )
  })

  it('recursively expands aliases without looping', () => {
    const chain = aliases(['a', 'b'], ['b', 'echo ok'])
    const cycle = aliases(['a', 'b'], ['b', 'a extra'])

    expect(expandAliases('a', chain)).toBe('echo ok')
    expect(expandAliases('a', cycle)).toBe('a extra')
  })

  it('does not expand quoted or escaped command words', () => {
    const table = aliases(['ll', 'ls -l'])

    expect(expandAliases(String.raw`'ll' | "ll" | \ll`, table)).toBe(
      String.raw`'ll' | "ll" | \ll`,
    )
  })

  it('uses a trailing blank to make the following word alias-eligible', () => {
    const table = aliases(['wrapper', 'command '], ['ll', 'ls -l'])

    expect(expandAliases('wrapper ll target', table)).toBe('command  ls -l target')
  })

  it('keeps the new command word eligible after an empty replacement', () => {
    const table = aliases(['empty', ''], ['ll', 'ls -l'])

    expect(expandAliases('empty ll target', table)).toBe(' ls -l target')
  })
})
