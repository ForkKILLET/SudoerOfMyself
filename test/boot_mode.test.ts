import { describe, expect, it } from 'vitest'
import { parseBootMode } from '@/boot_mode'

describe('boot mode', () => {
  it('enables modes only for an explicit value of one', () => {
    expect(parseBootMode('?debug=1')).toEqual({ debug: true, recovery: false })
    expect(parseBootMode('?recovery=1&debug=1')).toEqual({ debug: true, recovery: true })
    expect(parseBootMode('?debug=0&recovery=true')).toEqual({ debug: false, recovery: false })
  })
})
