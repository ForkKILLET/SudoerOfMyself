import { Emitter } from './emitter'
import { AllConstructor } from './types'

export const placeholder = null as any

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export type Signal = {
    trigger: () => void
    signal: Promise<null>
}

export const createSignal = (): Signal => {
    let trigger: () => void = placeholder
    const signal = new Promise<null>(resolve => {
        trigger = () => resolve(null)
    })
    return { trigger, signal }
}

export class Stack<T> extends Array<T> {
    get top() {
        return this[this.length - 1]
    }
}

export const kBreak: unique symbol = Symbol('Control.break')
export const kContinue: unique symbol = Symbol('Control.continue')

export const Control = {
    break: kBreak,
    continue: kContinue
} as const

export type Computed<T> = T | (() => T)
export const compute = <T>(value: Computed<T>): T => (
    typeof value === 'function' ? (value as () => T)() : value
)


export const mixin = <C, M>(ctor: AllConstructor<C>, mixin: AllConstructor<M>) => Object
    .getOwnPropertyNames(mixin.prototype)
    .filter(key => key !== 'constructor')
    .forEach(key => {
        ctor.prototype[key] = mixin.prototype[key]
    })

export const id = <T>(value: T) => value

export class AbortEmitter extends Emitter<{ abort: [] }> {}

export type IAbortable = {
    abortEmitter: AbortEmitter
}

export const prop = <T, K extends keyof T>(key: K) => (obj: T) => obj[key]