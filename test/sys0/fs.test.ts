import { describe, expect, it } from 'vitest'
import { FileT, FOp, Fs, FsMigration, Inode } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import { Bitmap } from '@/utils/bitmap'

const createFs = () => {
  const persistence = new MemoryFsPersistence()
  const fs = new Fs(Vfs.dir({
    'notes.txt': Vfs.normal('one\ntwo\n'),
    'empty': Vfs.dir(),
    'nested': Vfs.dir({ child: Vfs.normal('data') }),
  }), { persistence })
  return { fs, persistence }
}

describe('Fs file handles', () => {
  it('consumes line separators while reading lines', () => {
    const { fs } = createFs()
    const handle = fs.openU('/notes.txt', 'r').handle

    expect(handle.readLn()).toBe('one')
    expect(handle.readLn()).toBe('two')
    expect(handle.readKey()).toBe('\x04')
  })

  it('truncates a file once and preserves consecutive writes', () => {
    const { fs } = createFs()
    const handle = fs.openU('/notes.txt', 'w').handle

    handle.write('hello')
    handle.write(' world')

    expect(fs.openU('/notes.txt', 'r').handle.read()).toBe('hello world')
  })

  it('preserves existing content in append mode', () => {
    const { fs } = createFs()
    const handle = fs.openU('/notes.txt', 'a').handle

    handle.write('three')
    handle.writeLn(' four')

    expect(fs.openU('/notes.txt', 'r').handle.read()).toBe('one\ntwo\nthree four\n')
  })
})

describe('Fs mutation consistency', () => {
  it('removes regular files and empty directories', () => {
    const { fs } = createFs()

    expect(fs.rm('/notes.txt').isOk).toBe(true)
    expect(fs.rm('/empty').isOk).toBe(true)
    expect(fs.find('/notes.txt').isErr).toBe(true)
    expect(fs.find('/empty').isErr).toBe(true)
  })

  it('refuses to remove a non-empty directory directly', () => {
    const { fs } = createFs()
    const result = fs.rm('/nested')

    expect(result.isErr).toBe(true)
    if (result.isErr) expect(result.err.type).toBe(FOp.T.IS_A_DIR)
  })

  it('clears persisted stale inodes when formatting', () => {
    const { fs, persistence } = createFs()
    const created = fs.openU('/temporary', 'w').handle
    created.write('stale')
    const temporaryIid = fs.findInodeU('/temporary').inode.iid

    fs.reset()

    expect(fs.find('/temporary').isErr).toBe(true)
    expect(persistence.get(temporaryIid)).toBeUndefined()
  })

  it('persists files created after the initial image', () => {
    const persistence = new MemoryFsPersistence()
    const image = Vfs.dir({})
    const firstBoot = new Fs(image, { persistence })
    firstBoot.openU('/save', 'w').handle.write('progress')

    const secondBoot = new Fs(image, { persistence })

    expect(secondBoot.openU('/save', 'r').handle.read()).toBe('progress')
  })

  it('applies each persisted file-system migration once', () => {
    const persistence = new MemoryFsPersistence()
    const image = Vfs.dir({ bin: Vfs.dir() })
    new Fs(image, { persistence })
    let migrationRuns = 0
    const migrations: FsMigration[] = [{
      version: 1,
      migrate: (fs) => {
        migrationRuns ++
        const bin = fs.findInodeU('/bin', { allowedTypes: [FileT.DIR] }).inode
        const created = fs.createAt(bin, 'new-command', Vfs.jsExe('new-command'))
        return created.isErr ? created : FOp.ok(undefined)
      },
    }]

    const migratedBoot = new Fs(image, { persistence, migrations })
    const followingBoot = new Fs(image, { persistence, migrations })

    expect(migratedBoot.find('/bin/new-command', { allowedTypes: [FileT.JSEXE] }).isOk).toBe(true)
    expect(followingBoot.find('/bin/new-command', { allowedTypes: [FileT.JSEXE] }).isOk).toBe(true)
    expect(migrationRuns).toBe(1)
    expect(persistence.schemaVersion).toBe(1)
  })

  it('rolls back partially allocated VFS images', () => {
    const maintainer = {
      inodes: new Map<number, Inode>(),
      inodeBitmap: new Bitmap(2),
    }

    const result = Vfs.create(maintainer, Vfs.dir({ child: Vfs.normal('data') }))

    expect(result.isErr).toBe(true)
    if (result.isErr) expect(result.err.type).toBe(FOp.T.OUT_OF_INODES)
    expect(maintainer.inodes.size).toBe(0)
    expect(maintainer.inodeBitmap.usedCount).toBe(0)
  })

  it('resolves relative paths through the injected working directory', () => {
    const persistence = new MemoryFsPersistence()
    const fs = new Fs(Vfs.dir({ home: Vfs.dir({ file: Vfs.normal('ok') }) }), {
      persistence,
      getCwd: () => '/home',
    })

    const result = fs.find('./file', { allowedTypes: [FileT.NORMAL] })

    expect(result.isOk && result.val.file.content).toBe('ok')
  })
})
