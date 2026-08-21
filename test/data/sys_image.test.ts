import { describe, expect, it } from 'vitest'
import { SYSTEM_FS_MIGRATIONS } from '@/data/sys_image'
import { FileT, Fs, Inode } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'

describe('system file-system migrations', () => {
  it('converts legacy JSEXE inodes to executable regular files', () => {
    const persistence = new MemoryFsPersistence()
    persistence.set(1, {
      iid: 1,
      file: { type: FileT.DIR, entries: { bin: 2 } },
    })
    persistence.set(2, {
      iid: 2,
      file: { type: FileT.DIR, entries: { legacy: 3 } },
    })
    persistence.set(3, {
      iid: 3,
      file: { type: 2, programName: 'legacy' } as unknown as Inode['file'],
    })
    persistence.isInitialized = true
    persistence.schemaVersion = 1

    const fs = new Fs(Vfs.dir({}), {
      persistence,
      migrations: SYSTEM_FS_MIGRATIONS,
    })
    const executable = fs.findInodeU('/bin/legacy').inode

    expect(executable.file).toEqual({ type: FileT.NORMAL, content: '' })
    expect(executable.executable).toEqual({ format: 'native', programId: 'legacy' })
    expect(persistence.schemaVersion).toBe(2)
  })
})
