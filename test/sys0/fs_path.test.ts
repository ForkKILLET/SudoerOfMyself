import { describe, expect, it } from 'vitest'
import { FileT, FOp, Fs } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Path } from '@/sys0/fs/path'
import { Vfs } from '@/sys0/fs/vfs'

describe('file-system paths', () => {
  it.each([
    ['/', '/'],
    ['/../../file', '/file'],
    ['/one//two/../three', '/one/three'],
    ['./one/./two', 'one/two'],
    ['../../one', '../../one'],
    ['', '.'],
  ])('normalizes %j to %j', (path, expected) => {
    expect(Path.normalize(path)).toBe(expected)
  })

  it('resolves relative paths against an absolute working directory', () => {
    expect(Path.resolve('../notes', '/home/user')).toBe('/home/notes')
    expect(Path.resolve('../../../../notes', '/home/user')).toBe('/notes')
    expect(Path.resolve('/var/../tmp', '/home/user')).toBe('/tmp')
  })

  it('splits parent paths and completion prefixes consistently', () => {
    expect(Path.getDirAndName('/home/user/file')).toEqual({
      dirname: '/home/user/',
      filename: 'file',
    })
    expect(Path.getDirAndName('relative')).toEqual({ dirname: './', filename: 'relative' })
    expect(Path.getDirAndName('/home/user/', true)).toEqual({
      dirname: '/home/user/',
      filename: '',
    })
  })

  it('requires a trailing-slash target to be a directory', () => {
    const fs = new Fs(Vfs.dir({
      file: Vfs.normal('data'),
      dir: Vfs.dir(),
    }), { persistence: new MemoryFsPersistence() })

    const file = fs.find('/file/')
    expect(file.isErr && file.err.type).toBe(FOp.T.NOT_DIR)
    const dir = fs.find('/dir/')
    expect(dir.isOk && dir.val.file.type).toBe(FileT.DIR)
  })

  it('preserves trailing-slash requirements through mount resolution', () => {
    const fs = new Fs(Vfs.dir({ bin: Vfs.dir() }), {
      persistence: new MemoryFsPersistence(),
      mounts: [{
        path: '/bin',
        image: Vfs.dir({ command: Vfs.normal('data') }),
        readOnly: true,
      }],
    })

    const result = fs.find('/bin/command/')
    expect(result.isErr && result.err.type).toBe(FOp.T.NOT_DIR)
  })
})
