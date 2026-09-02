import { describe, expect, it } from 'vitest'
import { expand, expandPathnames, parseLineAsync, tokenize } from '@/programs/hsh/parse'
import { expandPathname } from '@/programs/hsh/pathname'
import { ShellPatternPart } from '@/programs/shell_pattern'
import { Fs } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'

const active = (value: string): ShellPatternPart => ({ value, literal: false })

const createFs = () => new Fs(Vfs.dir({
  home: Vfs.dir({
    '.hidden.txt': Vfs.normal('hidden'),
    'a.txt': Vfs.normal('a'),
    'b.txt': Vfs.normal('b'),
    'note.md': Vfs.normal('note'),
    'dir': Vfs.dir({
      '.private.ts': Vfs.normal('private'),
      'x.ts': Vfs.normal('x'),
      'y.md': Vfs.normal('y'),
    }),
  }),
  other: Vfs.dir({ z: Vfs.normal('z') }),
}), { persistence: new MemoryFsPersistence() })

const parseWithFs = (source: string, env: Record<string, string> = {}) => {
  const fs = createFs()
  return parseLineAsync(source, { HOME: '/home', ...env }, {
    substituteCommand: async () => '',
    expandPathname: pattern => expandPathname(fs, '/home', pattern),
  })
}

describe('pathname expansion', () => {
  it('matches path segments in sorted order without including dotfiles', () => {
    const fs = createFs()

    expect(expandPathname(fs, '/home', [active('*.txt')])).toEqual(['a.txt', 'b.txt'])
    expect(expandPathname(fs, '/home', [active('dir/[xy].*')])).toEqual([
      'dir/x.ts',
      'dir/y.md',
    ])
    expect(expandPathname(fs, '/home', [active('.*.txt')])).toEqual(['.hidden.txt'])
  })

  it('preserves relative and absolute spelling while traversing directories', () => {
    const fs = createFs()

    expect(expandPathname(fs, '/home/dir', [active('../*.txt')])).toEqual([
      '../a.txt',
      '../b.txt',
    ])
    expect(expandPathname(fs, '/home', [active('/other/?')])).toEqual(['/other/z'])
    expect(expandPathname(fs, '/home', [active('missing/*')])).toEqual([])
  })

  it('expands unquoted patterns from source text and variables', async () => {
    await expect(parseWithFs('echo *.txt $PATTERN', { PATTERN: 'dir/*.ts' }))
      .resolves.toEqual({
        commands: [{ name: 'echo', args: ['a.txt', 'b.txt', 'dir/x.ts'] }],
      })
  })

  it('leaves quoted, escaped, and unmatched patterns literal', async () => {
    await expect(parseWithFs('echo "*.txt" \\*.txt "$PATTERN" none-*', {
      PATTERN: 'dir/*.ts',
    })).resolves.toEqual({
      commands: [{ name: 'echo', args: ['*.txt', '*.txt', 'dir/*.ts', 'none-*'] }],
    })
  })

  it('does not expand assignment values', async () => {
    await expect(parseWithFs('PATTERN=*.txt echo ok')).resolves.toEqual({
      commands: [{
        name: 'echo',
        args: ['ok'],
        assignments: [{ name: 'PATTERN', value: '*.txt' }],
      }],
    })
  })

  it('expands assignment-shaped words in for-style word lists', () => {
    const fs = createFs()
    const expanded = expandPathnames(
      expand(tokenize('*.txt'), {}),
      pattern => expandPathname(fs, '/home', pattern),
      { commandLine: false },
    )

    expect(expanded.map(token => token.content)).toEqual(['a.txt', 'b.txt'])
  })

  it('rejects a redirect target with multiple matches', async () => {
    await expect(parseWithFs('cat > *.txt')).rejects.toThrow('Ambiguous redirect: *.txt')
    await expect(parseWithFs('cat > note.*')).resolves.toEqual({
      commands: [{
        name: 'cat',
        args: [],
        redirections: [{ fd: 1, type: 'writeTo', path: 'note.md' }],
      }],
    })
  })
})
