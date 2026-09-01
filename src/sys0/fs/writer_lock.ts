export const FILE_SYSTEM_WRITER_LOCK_NAME = 'sudoer-of-myself:file-system-writer'

export interface FileSystemWriterLock {
  release(): void
}

export class FileSystemWriterLockUnavailableError extends Error {
  constructor() {
    super('The file system is already open for writing in another tab')
    this.name = 'FileSystemWriterLockUnavailableError'
  }
}

export const acquireFileSystemWriterLock = (
  lockManager: LockManager | undefined = globalThis.navigator?.locks,
) => {
  if (! lockManager) {
    return Promise.reject(new Error('This browser does not support the Web Locks API'))
  }

  return new Promise<FileSystemWriterLock>((resolve, reject) => {
    let acquisitionSettled = false
    const request = lockManager.request(
      FILE_SYSTEM_WRITER_LOCK_NAME,
      { mode: 'exclusive', ifAvailable: true },
      async (lock) => {
        if (! lock) {
          acquisitionSettled = true
          reject(new FileSystemWriterLockUnavailableError())
          return
        }

        await new Promise<void>((releaseLock) => {
          let released = false
          acquisitionSettled = true
          resolve({
            release: () => {
              if (released) return
              released = true
              releaseLock()
            },
          })
        })
      },
    )
    request.catch((error: unknown) => {
      if (! acquisitionSettled) reject(error)
    })
  })
}
