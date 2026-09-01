import type { AsyncFileSystemSnapshotStore } from './persistence'
import type { FileSystemSnapshot } from './save'

export const FILE_SYSTEM_DATABASE_NAME = 'sudoer-of-myself'
export const FILE_SYSTEM_DATABASE_VERSION = 1
export const FILE_SYSTEM_OBJECT_STORE = 'file-system'
export const FILE_SYSTEM_SNAPSHOT_KEY = 'current'

const requestResult = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.addEventListener('success', () => resolve(request.result), { once: true })
  request.addEventListener('error', () => reject(request.error ?? new Error('IndexedDB request failed')), {
    once: true,
  })
})

const transactionCompletion = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
  transaction.addEventListener('complete', () => resolve(), { once: true })
  transaction.addEventListener('abort', () => reject(
    transaction.error ?? new Error('IndexedDB transaction was aborted'),
  ), { once: true })
  transaction.addEventListener('error', () => reject(
    transaction.error ?? new Error('IndexedDB transaction failed'),
  ), { once: true })
})

export interface IndexedDbFileSystemStoreOptions {
  indexedDB?: IDBFactory
  databaseName?: string
  databaseVersion?: number | null
}

export class IndexedDbFileSystemStore implements AsyncFileSystemSnapshotStore {
  private constructor(private readonly database: IDBDatabase) {}

  static async open({
    indexedDB = globalThis.indexedDB,
    databaseName = FILE_SYSTEM_DATABASE_NAME,
    databaseVersion = FILE_SYSTEM_DATABASE_VERSION,
  }: IndexedDbFileSystemStoreOptions = {}) {
    const request = databaseVersion === null
      ? indexedDB.open(databaseName)
      : indexedDB.open(databaseName, databaseVersion)
    request.addEventListener('upgradeneeded', () => {
      const database = request.result
      if (! database.objectStoreNames.contains(FILE_SYSTEM_OBJECT_STORE)) {
        database.createObjectStore(FILE_SYSTEM_OBJECT_STORE)
      }
    })
    const database = await requestResult(request)
    return new IndexedDbFileSystemStore(database)
  }

  async load() {
    const transaction = this.database.transaction(FILE_SYSTEM_OBJECT_STORE, 'readonly')
    const completion = transactionCompletion(transaction)
    const snapshot = await requestResult(
      transaction.objectStore(FILE_SYSTEM_OBJECT_STORE).get(FILE_SYSTEM_SNAPSHOT_KEY),
    ) as unknown
    await completion
    return snapshot
  }

  async save(snapshot: FileSystemSnapshot) {
    const transaction = this.database.transaction(FILE_SYSTEM_OBJECT_STORE, 'readwrite')
    const completion = transactionCompletion(transaction)
    transaction.objectStore(FILE_SYSTEM_OBJECT_STORE).put(snapshot, FILE_SYSTEM_SNAPSHOT_KEY)
    await completion
  }

  async clear() {
    const transaction = this.database.transaction(FILE_SYSTEM_OBJECT_STORE, 'readwrite')
    const completion = transactionCompletion(transaction)
    transaction.objectStore(FILE_SYSTEM_OBJECT_STORE).clear()
    await completion
  }

  close() {
    this.database.close()
  }
}

export const deleteIndexedDbFileSystem = ({
  indexedDB = globalThis.indexedDB,
  databaseName = FILE_SYSTEM_DATABASE_NAME,
}: Omit<IndexedDbFileSystemStoreOptions, 'databaseVersion'> = {}) => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase(databaseName)
  request.addEventListener('success', () => resolve(), { once: true })
  request.addEventListener('error', () => reject(
    request.error ?? new Error('Could not delete the file-system database'),
  ), { once: true })
  request.addEventListener('blocked', () => reject(
    new Error('Close other tabs running the game before resetting the save'),
  ), { once: true })
})
