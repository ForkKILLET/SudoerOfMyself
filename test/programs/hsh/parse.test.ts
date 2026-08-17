import { describe, expect, it } from 'vitest'
import { expand, parse, tokenize } from '@/programs/hsh/parse'

describe('hsh parser', () => {
  it('expands variables and quoted text into one argument', () => {
    const tokens = tokenize('echo "hello $USER"')
    const expanded = expand(tokens, { USER: 'sudoer' })

    expect(parse(expanded)).toEqual({
      commands: [{
        name: 'echo',
        args: ['hello sudoer'],
      }],
    })
  })

  it('parses output redirects', () => {
    const script = parse(expand(tokenize('echo hello >> output.txt'), {}))

    expect(script).toEqual({
      commands: [{
        name: 'echo',
        args: ['hello'],
        output: { type: 'appendTo', path: 'output.txt' },
      }],
    })
  })

  it('reports incomplete quoted input', () => {
    expect(() => tokenize('echo \'unfinished')).toThrow('Unmatched single quote')
  })
})
