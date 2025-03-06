export type Bit = 0 | 1

export class Bitmap {
    readonly data: Uint8Array
    readonly bits: Record<number, Bit>

    private _usedCount = 0
    get usedCount() {
        return this._usedCount
    }

    constructor(public readonly size: number) {
        this.data = new Uint8Array(Math.ceil(size / 8))

        this.bits = new Proxy(this.data, {
            get: (target, prop) => {
                if (typeof prop === 'string') {
                    const index = parseInt(prop)
                    const byteIndex = Math.trunc(index / 8)
                    const bitIndex = index % 8
                    return (target[byteIndex] & (1 << bitIndex)) >> bitIndex
                }

                return Reflect.get(target, prop)
            },
            set: (target, prop, value) => {
                if (typeof prop === 'string') {
                    const index = parseInt(prop)
                    const byteIndex = Math.trunc(index / 8)
                    const bitIndex = index % 8
                    const mask = 1 << bitIndex
                    if (value) {
                        if (! (target[byteIndex] & mask)) {
                            this._usedCount ++
                            target[byteIndex] |= mask
                        }
                    }
                    else {
                        if (target[byteIndex] & mask) {
                            this._usedCount --
                            target[byteIndex] &= ~ mask
                        }
                    }
                    return true
                }

                return Reflect.set(target, prop, value)
            },
        }) as Record<number, Bit>
    }

    fill(start: number, end: number, value: Bit) {
        let startByteIndex = Math.trunc(start / 8)
        const startBitIndex = start % 8
        const endByteIndex = Math.trunc(end / 8)
        const endBitIndex = end % 8

        if (startBitIndex) {
            const mask = (1 << (8 - startBitIndex)) - 1
            if (value) this.data[startByteIndex] |= mask
            else this.data[startByteIndex] &= ~ mask
            startByteIndex ++
        }

        const byte = value ? 0xFF : 0x00
        for (let byteIndex = startByteIndex; byteIndex < endByteIndex; byteIndex ++) {
            this.data[byteIndex] = byte
        }

        if (endBitIndex) {
            const mask = (1 << endBitIndex) - 1
            if (value) this.data[endByteIndex] |= mask
            else this.data[endByteIndex] &= ~ mask
        }
    }

    getFree(start = 0, end = this.size - 1) {
        for (let i = start; i <= end; i ++) {
            if (! this.bits[i]) {
                this.bits[i] = 1
                return i
            }
        }
        return - 1
    }
}