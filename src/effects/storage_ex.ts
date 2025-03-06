import { PersistenceData as PData, PersistenceKey as PKey } from '@/data/persistence'

declare global {
    interface Storage {
        getJson: <K extends PKey>(key: K) => PData[K] | undefined
        getJsonOr: <K extends PKey>(key: K, defaultValue: PData[K]) => PData[K]
        setJson: <K extends PKey>(key: K, value: PData[K]) => void
    }
}

Storage.prototype.getJson = function<K extends PKey>(key: K): PData[K] | undefined {
    const value = this.getItem(key)
    if (value === null) return undefined
    return JSON.parse(value)
}

Storage.prototype.getJsonOr = function<K extends PKey>(key: K, defaultValue: PData[K]): PData[K] {
    const value = this.getItem(key)
    if (value === null) return defaultValue
    return JSON.parse(value)
}

Storage.prototype.setJson = function<K extends PKey>(key: K, value: PData[K]): void {
    this.setItem(key, JSON.stringify(value))
}