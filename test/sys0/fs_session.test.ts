import { describe, expect, it } from 'vitest'
import { FileT, FOp, Fs } from '@/sys0/fs'
import { FsSession } from '@/sys0/fs/session'
import { Vfs } from '@/sys0/fs/vfs'
import { createProcessCredentials } from '@/sys0/identity'

const createSession = (uid = 1000, gid = 1000, umask = 0o022) => {
  const fs = new Fs(Vfs.dir({
    public: Vfs.dir({
      'readable.txt': Vfs.normal('public', { mode: 0o644 }),
      'readonly.txt': Vfs.normal('readonly', { uid: 1000, gid: 1000, mode: 0o400 }),
    }, { mode: 0o755 }),
    locked: Vfs.dir({
      'secret.txt': Vfs.normal('secret'),
    }, { mode: 0o700 }),
    home: Vfs.dir({}, { uid: 1000, gid: 1000, mode: 0o700 }),
    tmp: Vfs.dir({
      'root.txt': Vfs.normal('root'),
      'human.txt': Vfs.normal('human', { uid: 1000, gid: 1000 }),
    }, { mode: 0o777 }),
  }))
  fs.findInodeU('/tmp').inode.metadata.mode = 0o1777
  const session = new FsSession(
    fs,
    () => '/home',
    () => createProcessCredentials(uid, gid),
    () => umask,
  )
  return { fs, session }
}

describe('process file-system session permissions', () => {
  it('requires execute permission while traversing directories', () => {
    const { session } = createSession()

    const result = session.findInode('/locked/secret.txt')

    expect(result).toEqual(FOp.err({ type: FOp.T.PERMISSION_DENIED }))
    expect(session.findDirectoryForAccess('/locked')).toEqual(
      FOp.err({ type: FOp.T.PERMISSION_DENIED }),
    )
  })

  it('checks file read and write permissions before opening', () => {
    const { session } = createSession()

    expect(session.open('/public/readable.txt', 'r').isOk).toBe(true)
    expect(session.open('/public/readable.txt', 'w')).toEqual(
      FOp.err({ type: FOp.T.PERMISSION_DENIED }),
    )
    expect(session.open('/public/readonly.txt', 'r').isOk).toBe(true)
    expect(session.open('/public/readonly.txt', 'a')).toEqual(
      FOp.err({ type: FOp.T.PERMISSION_DENIED }),
    )
  })

  it('checks parent permissions and applies process ownership and umask on creation', () => {
    const { fs, session } = createSession(1000, 1000, 0o027)

    expect(session.open('/public/new.txt', 'w')).toEqual(
      FOp.err({ type: FOp.T.PERMISSION_DENIED }),
    )
    expect(session.open('/home/new.txt', 'w').isOk).toBe(true)
    expect(session.mkdir('/home/new-dir').isOk).toBe(true)
    expect(fs.findInodeU('/home/new.txt').inode.metadata).toMatchObject({
      uid: 1000,
      gid: 1000,
      mode: 0o640,
    })
    expect(fs.findInodeU('/home/new-dir').inode.metadata).toMatchObject({
      uid: 1000,
      gid: 1000,
      mode: 0o750,
    })
  })

  it('enforces sticky-directory ownership when removing entries', () => {
    const { session } = createSession()

    expect(session.rm('/tmp/root.txt')).toEqual(FOp.err({ type: FOp.T.PERMISSION_DENIED }))
    expect(session.rm('/tmp/human.txt').isOk).toBe(true)
  })

  it('inherits the group and set-group-ID bit from a parent directory', () => {
    const { fs, session } = createSession()
    const home = fs.findInodeU('/home').inode
    home.metadata.gid = 2000
    home.metadata.mode = 0o2700

    expect(session.touch('/home/file').isOk).toBe(true)
    expect(session.mkdir('/home/dir').isOk).toBe(true)

    expect(fs.statU('/home/file').gid).toBe(2000)
    expect(fs.statU('/home/dir')).toMatchObject({ gid: 2000, mode: 0o2755 })
  })

  it('lets root bypass read and write checks', () => {
    const { session } = createSession(0, 0)

    expect(session.open('/locked/secret.txt', 'r').isOk).toBe(true)
    expect(session.open('/public/readable.txt', 'w').isOk).toBe(true)
    expect(session.findInode('/home', { allowedTypes: [FileT.DIR] }).isOk).toBe(true)
  })
})
