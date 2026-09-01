import { IDBFactory } from 'fake-indexeddb'
import { describe, expect, it } from 'vitest'
import { FileT, Fs } from '@/sys0/fs'
import { IndexedDbFileSystemStore } from '@/sys0/fs/indexed_db'
import { QueuedFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import {
  FILE_SYSTEM_SNAPSHOT_FORMAT,
  FILE_SYSTEM_SNAPSHOT_VERSION,
  FileSystemSnapshot,
} from '@/sys0/fs/save'

const snapshot: FileSystemSnapshot = {
  format: FILE_SYSTEM_SNAPSHOT_FORMAT,
  version: FILE_SYSTEM_SNAPSHOT_VERSION,
  generation: 4,
  rootIid: 1,
  inodes: [{ iid: 1, file: { type: FileT.DIR, entries: {} } }],
}

describe('IndexedDbFileSystemStore', () => {
  it('loads, atomically replaces, and clears the current snapshot', async () => {
    const indexedDB = new IDBFactory()
    const store = await IndexedDbFileSystemStore.open({
      indexedDB,
      databaseName: 'fs-indexed-db-test',
    })

    expect(await store.load()).toBeUndefined()
    await store.save(snapshot)
    expect(await store.load()).toEqual(snapshot)
    await store.clear()
    expect(await store.load()).toBeUndefined()

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
