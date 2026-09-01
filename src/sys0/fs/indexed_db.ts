import {
  type AsyncFileSystemStore,
  FileSystemRevisionConflictError,
} from './persistence'
import type { FileSystemSnapshot } from './save'
import {
  type FileSystemImage,
  FILE_SYSTEM_IMAGE_FORMAT,
  FILE_SYSTEM_IMAGE_VERSION,
  type FsDelta,
} from './image'

export const FILE_SYSTEM_DATABASE_NAME = 'sudoer-of-myself'
export const FILE_SYSTEM_DATABASE_VERSION = 2
export const FILE_SYSTEM_OBJECT_STORE = 'file-system'
export const FILE_SYSTEM_META_OBJECT_STORE = 'meta'
export const FILE_SYSTEM_INODES_OBJECT_STORE = 'inodes'
export const FILE_SYSTEM_SNAPSHOT_KEY = 'current'
export const FILE_SYSTEM_PREVIOUS_SNAPSHOT_KEY = 'previous'
export const FILE_SYSTEM_META_KEY = 'file-system'

interface StoredFileSystemMetadata {
  format: FileSystemImage['format']
  version: FileSystemImage['version']
  revision: number
  rootIid: number
}

export interface RawIndexedDbFileSystem {
  metadata: unknown
  inodes: unknown[]
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
)

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

export class IndexedDbFileSystemStore implements AsyncFileSystemStore {
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
      if (! database.objectStoreNames.contains(FILE_SYSTEM_META_OBJECT_STORE)) {
        database.createObjectStore(FILE_SYSTEM_META_OBJECT_STORE)
      }
      if (! database.objectStoreNames.contains(FILE_SYSTEM_INODES_OBJECT_STORE)) {
        database.createObjectStore(FILE_SYSTEM_INODES_OBJECT_STORE, { keyPath: 'iid' })
      }
    })
    const database = await requestResult(request)
    return new IndexedDbFileSystemStore(database)
  }

  async load() {
    const { metadata, inodes } = await this.exportRaw()
    if (metadata === undefined) {
      if (inodes.length) return { metadata, inodes }
      return undefined
    }
    if (! isRecord(metadata)) return { metadata, inodes }
    return { ...metadata, inodes }
  }

  async exportRaw(): Promise<RawIndexedDbFileSystem> {
    const transaction = this.database.transaction([
      FILE_SYSTEM_META_OBJECT_STORE,
      FILE_SYSTEM_INODES_OBJECT_STORE,
    ], 'readonly')
    const completion = transactionCompletion(transaction)
    const [metadata, inodes] = await Promise.all([
      requestResult(
        transaction.objectStore(FILE_SYSTEM_META_OBJECT_STORE).get(FILE_SYSTEM_META_KEY),
      ) as Promise<unknown>,
      requestResult(
        transaction.objectStore(FILE_SYSTEM_INODES_OBJECT_STORE).getAll(),
      ) as Promise<unknown[]>,
    ])
    await completion
    return { metadata, inodes }
  }

  async loadPrevious() {
    return this.loadLegacyKey(FILE_SYSTEM_PREVIOUS_SNAPSHOT_KEY)
  }

  private async loadLegacyKey(key: string) {
    const transaction = this.database.transaction(FILE_SYSTEM_OBJECT_STORE, 'readonly')
    const completion = transactionCompletion(transaction)
    const snapshot = await requestResult(
      transaction.objectStore(FILE_SYSTEM_OBJECT_STORE).get(key),
    ) as unknown
    await completion
    return snapshot
  }

  async save(snapshot: FileSystemSnapshot) {
    const transaction = this.database.transaction(FILE_SYSTEM_OBJECT_STORE, 'readwrite')
    const completion = transactionCompletion(transaction)
    const store = transaction.objectStore(FILE_SYSTEM_OBJECT_STORE)
    const currentRequest = store.get(FILE_SYSTEM_SNAPSHOT_KEY)
    currentRequest.addEventListener('success', () => {
      if (currentRequest.result !== undefined) {
        store.put(currentRequest.result, FILE_SYSTEM_PREVIOUS_SNAPSHOT_KEY)
      }
      store.put(snapshot, FILE_SYSTEM_SNAPSHOT_KEY)
    }, { once: true })
    await completion
  }

  async commit(delta: FsDelta, expectedRevision: number) {
    const transaction = this.database.transaction([
      FILE_SYSTEM_META_OBJECT_STORE,
      FILE_SYSTEM_INODES_OBJECT_STORE,
    ], 'readwrite')
    const completion = transactionCompletion(transaction)
    const metadataStore = transaction.objectStore(FILE_SYSTEM_META_OBJECT_STORE)
    const inodeStore = transaction.objectStore(FILE_SYSTEM_INODES_OBJECT_STORE)
    const metadataRequest = metadataStore.get(FILE_SYSTEM_META_KEY)
    let operationError: Error | undefined

    metadataRequest.addEventListener('success', () => {
      const current = metadataRequest.result as StoredFileSystemMetadata | undefined
      const actualRevision = current?.revision ?? 0
      if (actualRevision !== expectedRevision) {
        operationError = new FileSystemRevisionConflictError(expectedRevision, actualRevision)
        transaction.abort()
        return
      }
      if (! current && ! delta.replaceAll) {
        operationError = new Error('Cannot patch a missing file-system image')
        transaction.abort()
        return
      }

      const replacement = delta.replaceAll
      const rootIid = replacement?.rootIid ?? current?.rootIid
      if (rootIid === undefined) {
        operationError = new Error('File-system root inode is missing')
        transaction.abort()
        return
      }
      if (replacement) {
        inodeStore.clear()
        replacement.inodes.forEach(inode => inodeStore.put(inode))
      }
      delta.deletes.forEach(iid => inodeStore.delete(iid))
      delta.puts.forEach(inode => inodeStore.put(inode))
      metadataStore.put({
        format: replacement?.format ?? current?.format ?? FILE_SYSTEM_IMAGE_FORMAT,
        version: replacement?.version ?? current?.version ?? FILE_SYSTEM_IMAGE_VERSION,
        revision: actualRevision + 1,
        rootIid,
      } satisfies StoredFileSystemMetadata, FILE_SYSTEM_META_KEY)
    }, { once: true })

    try {
      await completion
    }
    catch (error) {
      throw operationError ?? error
    }
    return expectedRevision + 1
  }

  async restore(snapshot: FileSystemSnapshot) {
    const transaction = this.database.transaction(FILE_SYSTEM_OBJECT_STORE, 'readwrite')
    const completion = transactionCompletion(transaction)
    transaction.objectStore(FILE_SYSTEM_OBJECT_STORE).put(snapshot, FILE_SYSTEM_SNAPSHOT_KEY)
    await completion
  }

  async clear() {
    const transaction = this.database.transaction([
      FILE_SYSTEM_OBJECT_STORE,
      FILE_SYSTEM_META_OBJECT_STORE,
      FILE_SYSTEM_INODES_OBJECT_STORE,
    ], 'readwrite')
    const completion = transactionCompletion(transaction)
    transaction.objectStore(FILE_SYSTEM_OBJECT_STORE).clear()
    transaction.objectStore(FILE_SYSTEM_META_OBJECT_STORE).clear()
    transaction.objectStore(FILE_SYSTEM_INODES_OBJECT_STORE).clear()
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
