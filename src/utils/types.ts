export type RemoveIndex<T> = {
    [K in keyof T as
        string extends K ? never :
        number extends K ? never :
        K
    ]: T[K]
}

export type Nullable<T> = T | null | undefined

export type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type StrictPick<T, K extends keyof T> = Pick<T, K>
export type StrictOmit<T, K extends keyof T> = Omit<T, K>

export type DistributiveOmit<T, K extends keyof T> = T extends any ? Omit<T, K> : never
export type DistributivePick<T, K extends keyof T> = T extends any ? Pick<T, K> : never

export type Pred<T> = (value: T) => boolean

export type Fn = (...args: any[]) => any

export type Awaitable<T> = T | Promise<T>

export interface IStorage<K, V> {
    get: (key: K) => V
    getAll: () => [K, V][]
    set: (key: K, value: V) => void
}

export type StringKeyOf<T> = keyof T & string
export type StringifiedKeyOf<T> = `${Exclude<keyof T, symbol>}`

export type IsEqual<T, U> =
    T extends U
        ? U extends T
            ? true
            : false
        : false

export type Intersect<T, U> = {
    [K in keyof T & keyof U as
        IsEqual<T[K], U[K]> extends true ? K : never
    ]: T[K]
}

export type Constructor<T> = new (...args: any[]) => T
export type AbstarctConstructor<T> = abstract new (...args: any[]) => T
export type AllConstructor<T> = Constructor<T> | AbstarctConstructor<T>