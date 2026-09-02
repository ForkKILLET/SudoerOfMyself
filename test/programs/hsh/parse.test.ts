import { describe, expect, it } from 'vitest'
import { expand, parse, parseLine, tokenize } from '@/programs/hsh/parse'

describe('hsh parser', () => {
  it('reports half-open source ranges for every token kind', () => {
    const source = 'echo "$USER"x 2>>out | \\{a\\} $(cmd) ${name} $((1 + 2)) &'
    const tokens = tokenize(source)

    expect(tokens.map(token => ({
      type: token.type,
      range: [token.begin, token.end],
      source: source.slice(token.begin, token.end),
    }))).toEqual([
      { type: 'text', range: [0, 4], source: 'echo' },
      { type: 'variable', range: [6, 11], source: '$USER' },
      { type: 'text', range: [12, 13], source: 'x' },
      { type: 'redirect', range: [14, 17], source: '2>>' },
      { type: 'text', range: [17, 20], source: 'out' },
      { type: 'pipe', range: [21, 22], source: '|' },
      { type: 'text', range: [23, 25], source: '\\{' },
      { type: 'text', range: [25, 26], source: 'a' },
      { type: 'text', range: [26, 28], source: '\\}' },
      { type: 'substitution', range: [29, 35], source: '$(cmd)' },
      { type: 'parameter', range: [36, 43], source: '${name}' },
      { type: 'arithmetic', range: [44, 54], source: '$((1 + 2))' },
      { type: 'background', range: [55, 56], source: '&' },
    ])
  })

  it('keeps expanded tokens adjacent across closing double quotes', () => {
    expect(parseLine('emit "$VALUE"x "$(cmd)"y "$((1 + 1))"z', { VALUE: 'v' }, {
      commandResults: new Map([[16, 'command']]),
    })).toEqual({
      commands: [{ name: 'emit', args: ['vx', 'commandy', '2z'] }],
    })
  })

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

  it('parses command-prefix environment assignments after expanding their values', () => {
    expect(parseLine('var=$var EMPTY= command "$var"', { var: 'before' })).toEqual({
      commands: [{
        name: 'command',
        args: ['before'],
        assignments: [
          { name: 'var', value: 'before' },
          { name: 'EMPTY', value: '' },
        ],
      }],
    })
  })

  it('expands command-prefix assignments from left to right without changing argv expansion', () => {
    expect(parseLine('a=inner b=$a command $a $b', {
      a: 'outer',
      b: 'outer-b',
    })).toEqual({
      commands: [{
        name: 'command',
        args: ['outer', 'outer-b'],
        assignments: [
          { name: 'a', value: 'inner' },
          { name: 'b', value: 'inner' },
        ],
      }],
    })
  })

  it('parses assignments without a command', () => {
    expect(parseLine('first=one second=$first EMPTY=', { first: 'old' })).toEqual({
      commands: [{
        name: '',
        args: [],
        assignments: [
          { name: 'first', value: 'one' },
          { name: 'second', value: 'one' },
          { name: 'EMPTY', value: '' },
        ],
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

  it('expands unquoted brace fragments inside a partly quoted word', () => {
    expect(parseLine(
      'echo "["{1..5}"]" "{"{a,b}"}" pre"{x,y}"post "pre"{x,y}"post"',
      {},
    )).toEqual({
      commands: [{
        name: 'echo',
        args: [
          '[1]', '[2]', '[3]', '[4]', '[5]',
          '{a}', '{b}',
          'pre{x,y}post',
          'prexpost', 'preypost',
        ],
      }],
    })
  })

  it('keeps adjacent quoted and unquoted fragments in the same word', () => {
    expect(parseLine(
      'emit a"$VALUE"b "$LEFT""$RIGHT" \'x\'"$VALUE"y',
      { VALUE: 'v', LEFT: 'l', RIGHT: 'r' },
    )).toEqual({
      commands: [{ name: 'emit', args: ['avb', 'lr', 'xvy'] }],
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
      '2': 'second',
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
        'first',
        'second',
        'first',
        'second',
        '',
        'previous',
        '7',
        '99',
      ],
    }])
  })

  it('expands braced parameters, defaults, alternatives, and lengths', () => {
    expect(parseLine(
      'echo ${name}x ${missing:-fallback} "${empty-default}" ${empty:-default} '
      + '${name:+alternate} "${missing:+wrong}" ${#unicode}',
      { name: 'value', empty: '', unicode: '你好🙂' },
    ).commands[0].args).toEqual([
      'valuex',
      'fallback',
      '',
      'default',
      'alternate',
      '',
      '3',
    ])
  })

  it('assigns parameter defaults and reports required missing parameters', () => {
    const env: Record<string, string> = {}

    expect(parseLine('echo ${created:=value}', env).commands[0].args).toEqual(['value'])
    expect(env.created).toBe('value')
    expect(() => parseLine('echo ${missing:?custom message}', env))
      .toThrow('custom message')
    expect(() => parseLine('echo ${missing:?}', env))
      .toThrow('missing: parameter null or not set')
  })

  it('reports unmatched and invalid parameter expansions', () => {
    expect(() => tokenize('echo ${unfinished')).toThrow('Unmatched parameter expansion')
    expect(() => parseLine('echo ${name:invalid}', { name: 'value' }))
      .toThrow('Bad substitution')
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

  it('splits unquoted expansions on IFS and preserves quoted expansions', () => {
    expect(parseLine('emit $WORDS "$WORDS" pre$WORDS-post $MISSING "$MISSING"', {
      WORDS: 'one two',
    })).toEqual({
      commands: [{
        name: 'emit',
        args: ['one', 'two', 'one two', 'preone', 'two-post', ''],
      }],
    })
    expect(parseLine('emit $VALUE', { IFS: ':', VALUE: 'one::three:' }))
      .toEqual({
        commands: [{ name: 'emit', args: ['one', '', 'three', ''] }],
      })
  })

  it('expands quoted and unquoted positional parameters with shell field boundaries', () => {
    const env = {
      '#': '2',
      '1': 'one',
      '2': 'two words',
      '@': 'one two words',
      '*': 'one two words',
    }

    expect(parseLine('emit $@ "$@" "$*" pre"$@"post', env)).toEqual({
      commands: [{
        name: 'emit',
        args: [
          'one', 'two', 'words',
          'one', 'two words',
          'one two words',
          'preone', 'two wordspost',
        ],
      }],
    })
    expect(parseLine('emit "$@" remaining', { '#': '0', '@': '', '*': '' }))
      .toEqual({ commands: [{ name: 'emit', args: ['remaining'] }] })
  })

  it('expands integer arithmetic without evaluating JavaScript', () => {
    expect(parseLine('emit $((count + 2 * 3)) "$((count > 3))"', { count: '4' }))
      .toEqual({
        commands: [{ name: 'emit', args: ['10', '1'] }],
      })
    expect(() => parseLine('emit $((1 / 0))', {})).toThrow('Division by zero')
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
