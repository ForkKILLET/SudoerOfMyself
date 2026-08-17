export const getJson = <T>(storage: Storage, key: string): T | undefined => {
  const value = storage.getItem(key)
  return value === null ? undefined : JSON.parse(value) as T
}

export const getJsonOr = <T>(storage: Storage, key: string, defaultValue: T): T => (
  getJson<T>(storage, key) ?? defaultValue
)

export const setJson = (storage: Storage, key: string, value: unknown) => {
  storage.setItem(key, JSON.stringify(value))
}
