import { describe, expect, it } from 'vitest'
import { Bitmap } from '@/utils/bitmap'

describe('Bitmap', () => {
  it('tracks the number of set bits without double counting', () => {
    const bitmap = new Bitmap(10)

    bitmap.set(3, 1)
    bitmap.set(3, 1)
    bitmap.set(9, 1)
    expect(bitmap.usedCount).toBe(2)

    bitmap.set(3, 0)
    bitmap.set(3, 0)
    expect(bitmap.usedCount).toBe(1)
  })

  it('allocates the first free bit in the requested range', () => {
    const bitmap = new Bitmap(8)

    expect(bitmap.getFree(2, 4)).toBe(2)
    expect(bitmap.getFree(2, 4)).toBe(3)
    expect(bitmap.getFree(2, 4)).toBe(4)
    expect(bitmap.getFree(2, 4)).toBe(- 1)
  })

  it('rejects invalid indexes', () => {
    const bitmap = new Bitmap(8)

    expect(() => bitmap.get(- 1)).toThrow(RangeError)
    expect(() => bitmap.set(8, 1)).toThrow(RangeError)
    expect(() => bitmap.get(1.5)).toThrow(RangeError)
  })
})
