import { describe, expect, it } from 'vitest'
import { FileT } from '@/sys0/fs'
import { formatFileMode, parseFileMode } from '@/sys0/fs/file_mode'

describe('file mode syntax', () => {
  it('parses octal and symbolic modes', () => {
    expect(parseFileMode('755', 0).unwrap()).toBe(0o755)
    expect(parseFileMode('u+x,g-w,o=', 0o664).unwrap()).toBe(0o740)
    expect(parseFileMode('a=rw,u+x', 0).unwrap()).toBe(0o766)
    expect(parseFileMode('g=u', 0o640).unwrap()).toBe(0o660)
  })

  it('supports conditional execute and an implicit-who umask', () => {
    expect(parseFileMode('a+X', 0o644, { isDirectory: false }).unwrap()).toBe(0o644)
    expect(parseFileMode('a+X', 0o644, { isDirectory: true }).unwrap()).toBe(0o755)
    expect(parseFileMode('+w', 0o444, { umask: 0o022 }).unwrap()).toBe(0o644)
  })

  it('formats regular, directory, and special permission bits', () => {
    expect(formatFileMode(0o4755, FileT.NORMAL)).toBe('-rwsr-xr-x')
    expect(formatFileMode(0o1770, FileT.DIR)).toBe('drwxrwx--T')
  })

  it('rejects malformed modes', () => {
    expect(parseFileMode('888', 0).isErr).toBe(true)
    expect(parseFileMode('user+x', 0).isErr).toBe(true)
  })
})
