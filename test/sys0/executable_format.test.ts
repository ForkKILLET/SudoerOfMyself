import { describe, expect, it } from 'vitest'
import {
  createSysExecutableContent,
  parseSysExecutable,
} from '@/sys0/executable_format'

describe('sys executable format', () => {
  it('round-trips a program identifier', () => {
    expect(parseSysExecutable(createSysExecutableContent('cat'))).toEqual({
      format: 'sys',
      programId: 'cat',
    })
  })

  it('rejects missing identifiers, arguments, and additional content', () => {
    expect(parseSysExecutable('#!sys\n')).toBeUndefined()
    expect(parseSysExecutable('#!sys cat\n')).toBeUndefined()
    expect(parseSysExecutable('#!sys\ncat --help\n')).toBeUndefined()
    expect(parseSysExecutable('#!sys\ncat\nextra\n')).toBeUndefined()
  })
})
