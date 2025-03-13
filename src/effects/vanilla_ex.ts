import { Control } from '@/utils'
import { StringifiedKeyOf } from '@/utils/types'

declare global {
    interface Array<T> {
        sum(this: number[]): number
        max(this: number[]): number
        min(this: number[]): number

        eraseOne(value: T): boolean

        sortWith<U>(fn: (value: T) => U): T[]

        groupWith<U extends keyof any>(fn: (value: T) => U): Record<U, T[]>
        divideWith<U extends T>(fn: (value: T) => value is U): [ U[], Exclude<T, U>[] ]
        divideWith(fn: (value: T) => boolean): [ T[], T[] ]

        findMap<U>(callback: (value: T, index: number, array: T[]) => U | typeof Control['continue']): U | undefined

        includes<U>(value: U): T & U extends never ? never : boolean
    }

    interface ReadonlyArray<T> {
        includes<U>(value: U): boolean
    }

    interface ArrayConstructor {
        range(start: number, end: number, step?: number): number[]
        replicate<T>(n: number, value: T): T[]
        lift<T>(value: T | T[]): T[]
    }

    interface ObjectConstructor {
        keys<T>(obj: T): StringifiedKeyOf<T>[]
        values<T>(obj: T): T[Exclude<keyof T, symbol>][]
        entries<T>(obj: T): [StringifiedKeyOf<T>, T[keyof T]][]

        assign<T, U extends T>(dest: T, src: U): T
    }

    interface Number {
        toPercent(precision?: number): string

        mod(operand: number): number
        remDiv(operand: number): [ number, number ]

        isBetween(min: number, max: number): boolean
    }

    interface PromiseConstructor {
        try<T>(fn: () => T): Promise<T>
    }
}

Array.prototype.sum = function(this: number[]) {
    return this.reduce((acc, curr) => acc + curr, 0)
}
Array.prototype.max = function(this: number[]) {
    return Math.max(...this)
}
Array.prototype.min = function(this: number[]) {
    return Math.min(...this)
}

Array.prototype.eraseOne = function(value) {
    const index = this.indexOf(value)
    if (index !== -1) {
        this.splice(index, 1)
        return true
    }
    return false
}

Array.prototype.sortWith = function<T, U>(this: T[], fn: (value: T) => U) {
    return this.sort((a, b) => {
        const fa = fn(a), fb = fn(b)
        return fa < fb ? - 1 : fa > fb ? 1 : 0
    })
}

Array.prototype.groupWith = function<T, U extends keyof any>(this: T[], fn: (value: T) => U) {
    const groups = {} as Record<U, T[]>
    this.forEach(value => {
        const key = fn(value)
        void (groups[key] ??= []).push(value)
    })
    return groups
}
Array.prototype.divideWith = function<T>(this: T[], fn: (value: T) => boolean) {
    const trues: T[] = [], falses: T[] = []
    this.forEach(value => (fn(value) ? trues : falses).push(value))
    return [ trues, falses ]
} as any

Array.prototype.findMap = function<T, U>(
    this: T[],
    callback: (value: T, index: number, array: T[]) => U | typeof Control['continue']
) {
    for (let i = 0; i < this.length; i ++) {
        const ret = callback(this[i], i, this)
        if (ret !== Control.continue) return ret
    }
}

Array.range = function(start: number, end: number, step = 1) {
    if (! step) throw new RangeError('Step cannot be zero')
    const arr = new this<number>()
    for (let i = start; step > 0 && i < end || step < 0 && i > end; i += step) arr.push(i)
    return arr
}
Array.replicate = function(n: number, value) {
    return new this(n).fill(value)
}
Array.lift = function(value) {
    return Array.isArray(value) ? value : [ value ]
}

Number.prototype.toPercent = function(this: number, precision = 0) {
    return `${(this * 100).toFixed(precision)}%`
}

Number.prototype.mod = function(this: number, operand: number) {
    if (! operand) return NaN
    const rem = this % operand
    return rem >= 0 ? rem : rem + operand
}
Number.prototype.remDiv = function(this: number, operand: number) {
    if (! operand) return [ NaN, NaN ]
    const rem = this % operand, div = (this - rem) / operand
    return [ rem, div ]
}

Number.prototype.isBetween = function(this: number, min: number, max: number) {
    return min <= this && this <= max
}

Promise.try ??= function<T>(fn: () => T) {
    return (async () => fn())()
}