import { describe, expect, it } from 'vitest'
import {
  acquireFileSystemWriterLock,
  FileSystemWriterLockUnavailableError,
  FileSystemWriterLockUnsupportedError,
} from '@/sys0/fs/writer_lock'

class FakeLockManager {
  private readonly heldNames = new Set<string>()

  async request<T>(
    name: string,
    options: LockOptions,
    callback: (lock: Lock | null) => T | PromiseLike<T>,
  ) {
    if (options.ifAvailable && this.heldNames.has(name)) return callback(null)
    this.heldNames.add(name)
    try {
      return await callback({ name, mode: options.mode ?? 'exclusive' } as Lock)
    }
    finally {
      this.heldNames.delete(name)
    }
  }
}

describe('file-system writer lock', () => {
  it('rejects browsers without the Web Locks API', async () => {
    await expect(acquireFileSystemWriterLock(null)).rejects.toBeInstanceOf(
      FileSystemWriterLockUnsupportedError,
    )
  })

  it('allows one writer and rejects a competing tab without waiting', async () => {
    const lockManager = new FakeLockManager() as unknown as LockManager
    const first = await acquireFileSystemWriterLock(lockManager)

    await expect(acquireFileSystemWriterLock(lockManager)).rejects.toBeInstanceOf(
      FileSystemWriterLockUnavailableError,
    )

    first.release()
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    const next = await acquireFileSystemWriterLock(lockManager)
    next.release()
  })

  it('makes release idempotent', async () => {
    const lockManager = new FakeLockManager() as unknown as LockManager
    const lock = await acquireFileSystemWriterLock(lockManager)

    expect(() => {
      lock.release()
      lock.release()
    }).not.toThrow()
  })
})
