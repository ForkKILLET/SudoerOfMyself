export type RemoveIndex<T> = {
    [K in keyof T as
        string extends K ? never :
        number extends K ? never :
        K
    ]: T[K]
}

export type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type StrictPick<T, K extends keyof T> = Pick<T, K>
export type StrictOmit<T, K extends keyof T> = Omit<T, K>

export type DistributiveOmit<T, K extends keyof T> = T extends any ? Omit<T, K> : never
export type DistributivePick<T, K extends keyof T> = T extends any ? Pick<T, K> : never
