import { IStorage } from '@/utils/types'
import { getJson, getJsonOr, setJson } from '@/utils/storage'
import { Inode } from '.'

export interface FsPersistence extends IStorage<number, Inode> {
  isInitialized: boolean
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
}
