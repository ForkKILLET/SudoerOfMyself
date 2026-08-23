import { IStorage } from '@/utils/types'
import { getJson, getJsonOr, setJson } from '@/utils/storage'
import { Inode } from '.'
import { FS_INITIALIZED_KEY, FS_INODE_KEY_PREFIX, isFileSystemSaveKey } from './save'

export interface FsPersistence extends IStorage<number, Inode> {
  isInitialized: boolean
  clear(): void
}

export class LocalStorageFsPersistence implements FsPersistence {
  get isInitialized() {
    return getJsonOr(localStorage, FS_INITIALIZED_KEY, false)
  }

  set isInitialized(value: boolean) {
    setJson(localStorage, FS_INITIALIZED_KEY, value)
  }

  get(iid: number) {
    return getJson<Inode>(localStorage, `${FS_INODE_KEY_PREFIX}${iid}`)
  }

  getAll() {
    return Object.entries(localStorage)
      .filter(([key]) => key.startsWith(FS_INODE_KEY_PREFIX))
      .map(([key, value]) => [
        parseInt(key.slice(FS_INODE_KEY_PREFIX.length)),
        JSON.parse(value),
      ] as [ number, Inode ])
  }

  set(iid: number, inode: Inode) {
    setJson(localStorage, `${FS_INODE_KEY_PREFIX}${iid}`, inode)
  }

  delete(iid: number) {
    localStorage.removeItem(`${FS_INODE_KEY_PREFIX}${iid}`)
  }

  clear() {
    Object.keys(localStorage)
      .filter(isFileSystemSaveKey)
      .forEach(key => localStorage.removeItem(key))
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
