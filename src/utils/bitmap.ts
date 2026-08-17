export type Bit = 0 | 1

export class Bitmap {
  private readonly data: Uint8Array
  private used = 0

  get usedCount() {
    return this.used
  }

  constructor(public readonly size: number) {
    this.data = new Uint8Array(Math.ceil(size / 8))
  }

  get(index: number): Bit {
    this.assertIndex(index)
    const byteIndex = Math.trunc(index / 8)
    const bitIndex = index % 8
    return ((this.data[byteIndex] & (1 << bitIndex)) >> bitIndex) as Bit
  }

  set(index: number, value: Bit) {
    this.assertIndex(index)
    const byteIndex = Math.trunc(index / 8)
    const bitIndex = index % 8
    const mask = 1 << bitIndex
    const previous = this.get(index)

    if (value) this.data[byteIndex] |= mask
    else this.data[byteIndex] &= ~ mask

    this.used += value - previous
  }

  clear() {
    this.used = 0
    this.data.fill(0)
  }

  getFree(start = 0, end = this.size - 1) {
    for (let index = start; index <= end; index ++) {
      if (! this.get(index)) {
        this.set(index, 1)
        return index
      }
    }
    return - 1
  }

  private assertIndex(index: number) {
    if (! Number.isInteger(index) || index < 0 || index >= this.size) {
      throw new RangeError(`Bitmap index out of bounds: ${index}`)
    }
  }
}
