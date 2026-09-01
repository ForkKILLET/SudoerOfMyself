import { describe, expect, it } from 'vitest'
import { expand, parse, parseLine, tokenize } from '@/programs/hsh/parse'

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

  it('expands brace alternatives with prefixes, suffixes, and adjacent variables', () => {
    expect(parseLine('echo pre{a,b,c}post x{1,2}{a,b} $HEAD{left,right}$TAIL', {
      HEAD: '<',
      TAIL: '>',
    })).toEqual({
      commands: [{
        name: 'echo',
        args: [
          'preapost',
          'prebpost',
          'precpost',
          'x1a',
          'x1b',
          'x2a',
          'x2b',
          '<left>',
          '<right>',
        ],
      }],
    })
  })

  it('expands ascending, descending, padded, and character ranges', () => {
    expect(parseLine('echo {1..3} {3..1} {-1..1} {01..3} {a..c} {C..A}', {}))
      .toEqual({
        commands: [{
          name: 'echo',
          args: [
            '1', '2', '3',
            '3', '2', '1',
            '-1', '0', '1',
            '01', '02', '03',
            'a', 'b', 'c',
            'C', 'B', 'A',
          ],
        }],
      })
  })

  it('supports nested alternatives and keeps non-expanding braces literal', () => {
    expect(parseLine('echo {a,{b,c}} "{d,e}" \\{f,g\\} {word..other}', {}))
      .toEqual({
        commands: [{
          name: 'echo',
          args: ['a', 'b', 'c', '{d,e}', '{f,g}', '{word..other}'],
        }],
      })
  })

  it('limits the size of brace expansion', () => {
    expect(() => parseLine('echo {1..10001}', {}))
      .toThrow('Brace expansion exceeds 10000 values')
    expect(() => parseLine('echo {1..101}{1..101}', {}))
      .toThrow('Brace expansion exceeds 10000 values')
  })

  it('parses output redirects', () => {
    const script = parse(expand(tokenize('echo hello >> output.txt'), {}))

    expect(script).toEqual({
      commands: [{
        name: 'echo',
        args: ['hello'],
        redirections: [{ fd: 1, type: 'appendTo', path: 'output.txt' }],
      }],
    })
  })

  it('parses input and output redirects together', () => {
    const script = parse(expand(tokenize('cat < input.txt > output.txt'), {}))

    expect(script).toEqual({
      commands: [{
        name: 'cat',
        args: [],
        redirections: [
          { fd: 0, type: 'readFrom', path: 'input.txt' },
          { fd: 1, type: 'writeTo', path: 'output.txt' },
        ],
      }],
    })
  })

  it('parses stderr redirects without treating the descriptor as an argument', () => {
    const script = parse(expand(tokenize('echo hello 2>> errors.txt'), {}))

    expect(script).toEqual({
      commands: [{
        name: 'echo',
        args: ['hello'],
        redirections: [{ fd: 2, type: 'appendTo', path: 'errors.txt' }],
      }],
    })
  })

  it('parses explicit stdin/stdout descriptors and preserves redirect order', () => {
    expect(parseLine('cat 0<input 1>first >second', {})).toEqual({
      commands: [{
        name: 'cat',
        args: [],
        redirections: [
          { fd: 0, type: 'readFrom', path: 'input' },
          { fd: 1, type: 'writeTo', path: 'first' },
          { fd: 1, type: 'writeTo', path: 'second' },
        ],
      }],
    })
  })

  it('parses arbitrary descriptors, duplication, and close redirects', () => {
    expect(parseLine('echo value 3>file 2>&1 4<&0 5>&-', {})).toEqual({
      commands: [{
        name: 'echo',
        args: ['value'],
        redirections: [
          { fd: 3, type: 'writeTo', path: 'file' },
          { fd: 2, type: 'duplicate', sourceFd: 1 },
          { fd: 4, type: 'duplicate', sourceFd: 0 },
          { fd: 5, type: 'close' },
        ],
      }],
    })
  })

  it('finishes a duplicate target before an adjacent redirect', () => {
    expect(parseLine('echo 2>&1>output', {})).toEqual({
      commands: [{
        name: 'echo',
        args: [],
        redirections: [
          { fd: 2, type: 'duplicate', sourceFd: 1 },
          { fd: 1, type: 'writeTo', path: 'output' },
        ],
      }],
    })
  })

  it('rejects a non-descriptor duplication target', () => {
    expect(() => parseLine('echo 2>&output', {}))
      .toThrow('Expected file descriptor, got output')
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
          redirections: [{ fd: 1, type: 'writeTo', path: 'output.txt' }],
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

  it('parses a background pipeline', () => {
    const script = parse(expand(tokenize('echo hello | tee output.txt &'), {}))

    expect(script).toEqual({
      commands: [
        { name: 'echo', args: ['hello'], pipeToNext: true },
        { name: 'tee', args: ['output.txt'] },
      ],
      background: true,
    })
  })

  it('expands the most recent background PID', () => {
    const script = parse(expand(tokenize('echo $!'), { '!': '42' }))

    expect(script.commands).toEqual([{ name: 'echo', args: ['42'] }])
  })

  it('tokenizes and expands special shell parameters', () => {
    const env = {
      '$': '42',
      '#': '2',
      '0': 'script.hsh',
      '1': 'first',
      '*': 'first second',
      '@': 'first second',
      '-': '',
      '_': 'previous',
      '?': '7',
      '!': '99',
    }
    const script = parse(expand(
      tokenize('echo $$ $# $0 $1 $* $@ "$-" $_ $? $!'),
      env,
    ))

    expect(script.commands).toEqual([{
      name: 'echo',
      args: [
        '42',
        '2',
        'script.hsh',
        'first',
        'first second',
        'first second',
        '',
        'previous',
        '7',
        '99',
      ],
    }])
  })

  it('requires the background marker to terminate the command', () => {
    expect(() => parse(expand(tokenize('echo one & echo two'), {})))
      .toThrow('Background marker must end the command')
  })

  it('reports incomplete quoted input', () => {
    expect(() => tokenize('echo \'unfinished')).toThrow('Unmatched single quote')
    expect(() => tokenize('echo "unfinished')).toThrow('Unmatched double quote')
  })

  it('reports a trailing escape in strict mode but tolerates it for completion', () => {
    expect(() => tokenize('echo unfinished\\')).toThrow('Trailing escape character')
    expect(tokenize('echo unfinished\\', false).at(- 1)?.content).toBe('unfinished\\')
  })

  it('preserves empty quoted arguments and adjacent quote segments', () => {
    expect(parseLine('echo "" \'\' a""b $MISSING""', {})).toEqual({
      commands: [{
        name: 'echo',
        args: ['', '', 'ab', ''],
      }],
    })
  })

  it('only expands the current-user home marker at the start of a word', () => {
    expect(parseLine('echo ~ ~/file prefix~ ~someone', { HOME: '/home/sudoer' })).toEqual({
      commands: [{
        name: 'echo',
        args: ['/home/sudoer', '/home/sudoer/file', 'prefix~', '~someone'],
      }],
    })
  })

  it('does not consume the expanded token array while parsing', () => {
    const tokens = expand(tokenize('echo hello | cat'), {})
    const before = structuredClone(tokens)

    parse(tokens)

    expect(tokens).toEqual(before)
  })
})
