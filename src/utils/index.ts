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

export const _break: unique symbol = Symbol('Control.break')
export const _continue: unique symbol = Symbol('Control.continue')

export const Control = {
    break: _break,
    continue: _continue
} as const

export type Computed<T> = T | (() => T)
export const compute = <T>(value: Computed<T>): T => (
    typeof value === 'function' ? (value as () => T)() : value
)
