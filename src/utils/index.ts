import { Emitter } from './emitter'
import { Nullable } from './types'

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export type Signal = {
  trigger: () => void
  promise: Promise<null>
  triggered: boolean
}

export const createSignal = (): Signal => {
  let trigger = () => {}
  const promise = new Promise<null>((resolve) => {
    trigger = () => {
      resolve(null)
      signal.triggered = true
    }
  })
  const signal = { trigger, promise, triggered: false }
  return signal
}

export type Computed<T> = T | (() => T)
export const compute = <T>(value: Computed<T>): T => (
  typeof value === 'function' ? (value as () => T)() : value
)

export const id = <T>(value: T) => value

export class AbortEmitter extends Emitter<{ abort: [] }> {}

export type IAbortable = {
  abortEmitter: AbortEmitter
}

export const prop = <T, K extends keyof T>(key: K) => (obj: T) => obj[key]

export const getCommonPrefix = (strs: string[]) => {
  if (! strs.length) return ''
  const min = Math.min(...strs.map(prop('length')))
  let i = 0
  while (i < min && new Set(strs.map(str => str[i])).size === 1) i ++
  return strs[0].slice(0, i)
}

export const pick = <T, K extends keyof T>(obj: T, keys: K[]) => {
  const result = {} as Pick<T, K>
  keys.forEach((key) => {
    result[key] = obj[key]
  })
  return result
}

export const equalBy = <T, K extends keyof T>(a: T, b: T, keys: K[]) => (
  keys.every(key => a[key] === b[key])
)

export const mapOrNull = <T, U>(value: Nullable<T>, fn: (value: T) => U) => (
  value == null ? null : fn(value)
)

export const range = (start: number, end: number, step = 1) => {
  if (! step) throw new RangeError('Step cannot be zero')

  const values: number[] = []
  for (let value = start; step > 0 ? value < end : value > end; value += step) {
    values.push(value)
  }
  return values
}

export const replicate = <T>(count: number, value: T) => Array<T>(count).fill(value)

export const liftArray = <T>(value: T | T[]) => Array.isArray(value) ? value : [value]

export function partition<T, U extends T>(
  values: T[],
  predicate: (value: T) => value is U,
): [U[], Exclude<T, U>[]]
export function partition<T>(
  values: T[],
  predicate: (value: T) => boolean,
): [T[], T[]]
export function partition<T>(
  values: T[],
  predicate: (value: T) => boolean,
): [T[], T[]] {
  const matches: T[] = []
  const rest: T[] = []
  values.forEach(value => (predicate(value) ? matches : rest).push(value))
  return [matches, rest]
}

export const modulo = (value: number, divisor: number) => {
  if (! divisor) return Number.NaN
  const remainder = value % divisor
  return remainder >= 0 ? remainder : remainder + divisor
}

export const divmod = (value: number, divisor: number): [number, number] => {
  if (! divisor) return [Number.NaN, Number.NaN]
  const remainder = value % divisor
  return [remainder, (value - remainder) / divisor]
}

export const isBetween = (value: number, min: number, max: number) => (
  min <= value && value <= max
)

export const toPercent = (value: number, precision = 0) => (
  `${(value * 100).toFixed(precision)}%`
)
