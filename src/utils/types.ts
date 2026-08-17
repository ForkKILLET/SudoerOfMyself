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

export type Pred<T> = (value: T) => boolean

export type Awaitable<T> = T | Promise<T>

export interface IStorage<K, V> {
  get: (key: K) => V | undefined
  getAll: () => [K, V][]
  set: (key: K, value: V) => void
  delete: (key: K) => void
}
