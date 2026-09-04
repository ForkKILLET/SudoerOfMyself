import { describe, expect, it } from 'vitest'
import { parseShebang } from '@/sys0/shebang'

describe('shebang syntax', () => {
  it('parses an absolute interpreter and one optional argument', () => {
    expect(parseShebang('#!/bin/hsh\necho ok\n').unwrap()).toEqual({
      interpreterPath: '/bin/hsh',
    })
    expect(parseShebang('#! /bin/interpreter  --mode value\r\n').unwrap()).toEqual({
      interpreterPath: '/bin/interpreter',
      argument: '--mode value',
    })
  })

  it('distinguishes ordinary files and rejects invalid interpreter paths', () => {
    expect(parseShebang('echo ok\n').unwrap()).toBeUndefined()
    expect(parseShebang('#!bin/hsh\n').isErr).toBe(true)
    expect(parseShebang('#!\n').isErr).toBe(true)
  })
})
