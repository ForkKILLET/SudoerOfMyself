import { IStorage } from '@/utils/types'
import { getJson, getJsonOr, setJson } from '@/utils/storage'
import { Inode } from '.'

export interface FsPersistence extends IStorage<number, Inode> {
  isInitialized: boolean
  clear(): void
}

export class LocalStorageFsPersistence implements FsPersistence {
  get isInitialized() {
    return getJsonOr(localStorage, 'fs:initialized', false)
  }

  set isInitialized(value: boolean) {
    setJson(localStorage, 'fs:initialized', value)
  }

  get(iid: number) {
    return getJson<Inode>(localStorage, `i:${iid}`)
  }

  getAll() {
    return Object.entries(localStorage)
      .filter(([key]) => key.startsWith('i:'))
      .map(([key, value]) => [parseInt(key.slice(2)), JSON.parse(value)] as [ number, Inode ])
  }

  set(iid: number, inode: Inode) {
    setJson(localStorage, `i:${iid}`, inode)
  }

  delete(iid: number) {
    localStorage.removeItem(`i:${iid}`)
  }

  clear() {
    Object.keys(localStorage)
      .filter(key => key.startsWith('i:'))
      .forEach(key => localStorage.removeItem(key))
    localStorage.removeItem('fs:initialized')
  }
}

export class MemoryFsPersistence implements FsPersistence {
  isInitialized = false
  private readonly inodes = new Map<number, Inode>()

  get(iid: number) {
    const inode = this.inodes.get(iid)
    return inode && structuredClone(inode)
  }

  getAll() {
    return [...this.inodes].map(([iid, inode]): [number, Inode] => [iid, structuredClone(inode)])
  }

  set(iid: number, inode: Inode) {
    this.inodes.set(iid, structuredClone(inode))
  }

  delete(iid: number) {
    this.inodes.delete(iid)
  }

  clear() {
    this.inodes.clear()
    this.isInitialized = false
  }
}
