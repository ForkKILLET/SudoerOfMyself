import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { FileT, Fs } from '@/sys0/fs'
import {
  FILE_SYSTEM_INODES_OBJECT_STORE,
  FILE_SYSTEM_META_OBJECT_STORE,
  IndexedDbFileSystemStore,
} from '@/sys0/fs/indexed_db'
import {
  FileSystemRevisionConflictError,
  QueuedFsPersistence,
} from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import {
  createPutDelta,
  createReplaceAllDelta,
  FILE_SYSTEM_IMAGE_FORMAT,
  FILE_SYSTEM_IMAGE_VERSION,
  type FileSystemReplacement,
} from '@/sys0/fs/image'

const metadata = { createdAt: 0, modifiedAt: 0 }

const replacement: FileSystemReplacement = {
  format: FILE_SYSTEM_IMAGE_FORMAT,
  version: FILE_SYSTEM_IMAGE_VERSION,
  rootIid: 1,
  inodes: [
    { iid: 1, file: { type: FileT.DIR, entries: { file: 2 } }, metadata },
    { iid: 2, file: { type: FileT.NORMAL, content: 'initial' }, metadata },
  ],
}

describe('IndexedDbFileSystemStore', () => {
  it('creates separate metadata and inode stores', async () => {
    const indexedDB = new IDBFactory()
    const databaseName = 'fs-indexed-db-schema-test'
    const store = await IndexedDbFileSystemStore.open({ indexedDB, databaseName })
    store.close()

    const request = indexedDB.open(databaseName)
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.addEventListener('success', () => resolve(request.result), { once: true })
      request.addEventListener('error', () => reject(request.error), { once: true })
    })
    expect([...database.objectStoreNames]).toEqual(expect.arrayContaining([
      FILE_SYSTEM_META_OBJECT_STORE,
      FILE_SYSTEM_INODES_OBJECT_STORE,
    ]))
    expect([...database.objectStoreNames]).not.toContain('file-system')
    const transaction = database.transaction(FILE_SYSTEM_INODES_OBJECT_STORE, 'readonly')
    expect(transaction.objectStore(FILE_SYSTEM_INODES_OBJECT_STORE).keyPath).toBe('iid')
    database.close()
  })

  it('removes the legacy snapshot store during schema upgrade', async () => {
    const indexedDB = new IDBFactory()
    const databaseName = 'fs-indexed-db-upgrade-test'
    const legacyRequest = indexedDB.open(databaseName, 2)
    legacyRequest.addEventListener('upgradeneeded', () => {
      legacyRequest.result.createObjectStore('file-system')
    }, { once: true })
    const legacyDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
      legacyRequest.addEventListener('success', () => resolve(legacyRequest.result), { once: true })
      legacyRequest.addEventListener('error', () => reject(legacyRequest.error), { once: true })
    })
    legacyDatabase.close()

    const store = await IndexedDbFileSystemStore.open({ indexedDB, databaseName })
    store.close()
    const currentRequest = indexedDB.open(databaseName)
    const currentDatabase = await new Promise<IDBDatabase>((resolve, reject) => {
      currentRequest.addEventListener('success', () => resolve(currentRequest.result), { once: true })
      currentRequest.addEventListener('error', () => reject(currentRequest.error), { once: true })
    })

    expect([...currentDatabase.objectStoreNames]).not.toContain('file-system')
    expect([...currentDatabase.objectStoreNames]).toEqual(expect.arrayContaining([
      FILE_SYSTEM_META_OBJECT_STORE,
      FILE_SYSTEM_INODES_OBJECT_STORE,
    ]))
    currentDatabase.close()
  })

  it('atomically commits deltas at an expected revision', async () => {
    const indexedDB = new IDBFactory()
    const store = await IndexedDbFileSystemStore.open({
      indexedDB,
      databaseName: 'fs-indexed-db-test',
    })

    expect(await store.load()).toBeUndefined()
    await expect(store.commit(createReplaceAllDelta(replacement), 0)).resolves.toBe(1)
    expect(await store.load()).toEqual({ ...replacement, revision: 1 })
    expect(await store.exportRaw()).toEqual({
      metadata: {
        format: FILE_SYSTEM_IMAGE_FORMAT,
        version: FILE_SYSTEM_IMAGE_VERSION,
        revision: 1,
        rootIid: 1,
      },
      inodes: replacement.inodes,
    })

    const update = createPutDelta({
      iid: 2,
      file: { type: FileT.NORMAL, content: 'updated' },
      metadata,
    })
    await expect(store.commit(update, 0)).rejects.toBeInstanceOf(FileSystemRevisionConflictError)
    expect((await store.load())?.inodes).toEqual(replacement.inodes)
    await expect(store.commit(update, 1)).resolves.toBe(2)
    expect(await store.load()).toEqual({
      ...replacement,
      revision: 2,
      inodes: [replacement.inodes[0], update.puts.get(2)],
    })

    await store.clear()
    expect(await store.load()).toBeUndefined()

    store.close()
  })

  it('clears stale inodes during replaceAll', async () => {
    const indexedDB = new IDBFactory()
    const store = await IndexedDbFileSystemStore.open({
      indexedDB,
      databaseName: 'fs-indexed-db-replace-test',
    })
    await store.commit(createReplaceAllDelta(replacement), 0)
    const emptyReplacement: FileSystemReplacement = {
      ...replacement,
      inodes: [{ iid: 1, file: { type: FileT.DIR, entries: {} }, metadata }],
    }

    await store.commit(createReplaceAllDelta(emptyReplacement), 1)

    expect(await store.load()).toEqual({ ...emptyReplacement, revision: 2 })
    store.close()
  })

  it('hydrates a new synchronous VFS instance after an async save', async () => {
    const indexedDB = new IDBFactory()
    const databaseName = 'fs-indexed-db-hydration-test'
    const firstStore = await IndexedDbFileSystemStore.open({ indexedDB, databaseName })
    const firstPersistence = await QueuedFsPersistence.create(firstStore)
    const firstFs = new Fs(Vfs.dir({}), { persistence: firstPersistence })
    firstFs.openU('/progress', 'w').handle.write('saved')
    await firstFs.flush()
    firstStore.close()

    const secondStore = await IndexedDbFileSystemStore.open({ indexedDB, databaseName })
    const secondPersistence = await QueuedFsPersistence.create(secondStore)
    const secondFs = new Fs(Vfs.dir({}), { persistence: secondPersistence })

    expect(secondFs.openU('/progress', 'r').handle.read()).toBe('saved')
    secondStore.close()
  })
})
