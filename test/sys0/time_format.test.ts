import { describe, expect, it } from 'vitest'
import { formatStrftime } from '@/sys0/time_format'

describe('strftime', () => {
  const timestamp = Date.parse('2099-07-13T23:30:05.000Z')

  it('formats calendar fields in an explicit timezone', () => {
    expect(formatStrftime('%a %A %b %B %d %e %F %T %z %Z', timestamp, 'UTC')).toBe(
      'Mon Monday Jul July 13 13 2099-07-13 23:30:05 +0000 UTC',
    )
    expect(formatStrftime('%F %T %z', timestamp, 'Asia/Shanghai')).toBe(
      '2099-07-14 07:30:05 +0800',
    )
  })

  it('supports epoch seconds and control sequences', () => {
    expect(formatStrftime('%s%%\n%n%t', timestamp, 'UTC')).toBe(
      `${Math.floor(timestamp / 1_000)}%\n\n\t`,
    )
  })
})
