import { FILE_SYSTEM_DATABASE_NAME } from '@/sys0/fs/indexed_db'
import { FILE_SYSTEM_WRITER_LOCK_NAME } from '@/sys0/fs/writer_lock'

export type StorageNamespaceName = 'main' | 'debug'

export interface StorageNamespace {
  name: StorageNamespaceName
  databaseName: string
  writerLockName: string
}

export const getStorageNamespace = (debug: boolean): StorageNamespace => {
  const name = debug ? 'debug' : 'main'
  const suffix = debug ? ':debug' : ''
  return {
    name,
    databaseName: `${FILE_SYSTEM_DATABASE_NAME}${suffix}`,
    writerLockName: `${FILE_SYSTEM_WRITER_LOCK_NAME}${suffix}`,
  }
}
