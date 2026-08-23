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

  it('parses input and output redirects together', () => {
    const script = parse(expand(tokenize('cat < input.txt > output.txt'), {}))

    expect(script).toEqual({
      commands: [{
        name: 'cat',
        args: [],
        input: { type: 'readFrom', path: 'input.txt' },
        output: { type: 'writeTo', path: 'output.txt' },
      }],
    })
  })

  it('parses stderr redirects without treating the descriptor as an argument', () => {
    const script = parse(expand(tokenize('echo hello 2>> errors.txt'), {}))

    expect(script).toEqual({
      commands: [{
        name: 'echo',
        args: ['hello'],
        error: { type: 'appendTo', path: 'errors.txt' },
      }],
    })
  })

  it('parses a pipeline as linked commands', () => {
    const script = parse(expand(tokenize('echo hello | cat | cat > output.txt'), {}))

    expect(script).toEqual({
      commands: [
        { name: 'echo', args: ['hello'], pipeToNext: true },
        { name: 'cat', args: [], pipeToNext: true },
        {
          name: 'cat',
          args: [],
          output: { type: 'writeTo', path: 'output.txt' },
        },
      ],
    })
  })

  it('rejects an incomplete pipeline', () => {
    expect(() => parse(expand(tokenize('echo hello |'), {})))
      .toThrow('Expected command after pipe')
  })

  it('keeps quoted and escaped pipe characters as ordinary arguments', () => {
    const script = parse(expand(tokenize('echo "left|right" a\\|b'), {}))

    expect(script).toEqual({
      commands: [{ name: 'echo', args: ['left|right', 'a|b'] }],
    })
  })

  it('reports incomplete quoted input', () => {
    expect(() => tokenize('echo \'unfinished')).toThrow('Unmatched single quote')
  })
})
