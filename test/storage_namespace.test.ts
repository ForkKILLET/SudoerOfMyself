import { describe, expect, it } from 'vitest'
import { getStorageNamespace } from '@/storage_namespace'
import { FILE_SYSTEM_DATABASE_NAME } from '@/sys0/fs/indexed_db'
import { FILE_SYSTEM_WRITER_LOCK_NAME } from '@/sys0/fs/writer_lock'

describe('storage namespaces', () => {
  it('keeps the main storage names stable and gives debug mode distinct names', () => {
    const main = getStorageNamespace(false)
    const debug = getStorageNamespace(true)

    expect(main).toEqual({
      name: 'main',
      databaseName: FILE_SYSTEM_DATABASE_NAME,
      writerLockName: FILE_SYSTEM_WRITER_LOCK_NAME,
    })
    expect(debug.name).toBe('debug')
    expect(debug.databaseName).not.toBe(main.databaseName)
    expect(debug.writerLockName).not.toBe(main.writerLockName)
  })
})
