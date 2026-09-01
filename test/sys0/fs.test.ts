import { describe, expect, it } from 'vitest'
import { FileT, FOp, Fs, Inode } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import { Bitmap } from '@/utils/bitmap'
import { cloneFsDelta, type FsDelta } from '@/sys0/fs/image'

class RecordingPersistence extends MemoryFsPersistence {
  readonly deltas: FsDelta[] = []

  override commit(delta: FsDelta) {
    super.commit(delta)
    this.deltas.push(cloneFsDelta(delta))
  }
}

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

  it('does not persist writes through a detached handle', async () => {
    const persistence = new RecordingPersistence()
    const image = Vfs.dir({ old: Vfs.normal('old') })
    const fs = new Fs(image, { persistence })
    const detached = fs.openU('/old', 'a').handle
    const detachedIid = fs.findInodeU('/old').inode.iid

    fs.rmU('/old')
    await fs.flush()
    fs.openU('/new', 'w').handle.write('current')
    expect(fs.findInodeU('/new').inode.iid).toBe(detachedIid)
    await fs.flush()
    const deltaCountBeforeDetachedWrite = persistence.deltas.length
    detached.write(' zombie')
    await fs.flush()

    expect(persistence.deltas).toHaveLength(deltaCountBeforeDetachedWrite)
    expect(fs.find('/old').isErr).toBe(true)
    const rebooted = new Fs(image, { persistence })
    expect(rebooted.openU('/new', 'r').handle.read()).toBe('current')
  })
})

describe('Fs mutation consistency', () => {
  it('registers exact inode puts, deletes, and full replacements', async () => {
    const persistence = new RecordingPersistence()
    const fs = new Fs(Vfs.dir({ file: Vfs.normal('old') }), { persistence })
    persistence.deltas.length = 0
    const rootIid = fs.root.iid
    const fileIid = fs.findInodeU('/file').inode.iid

    fs.openU('/file', 'a').handle.write(' content')
    await fs.flush()
    expect([...persistence.deltas.at(- 1)?.puts.keys() ?? []]).toEqual([fileIid])
    expect(persistence.deltas.at(- 1)?.deletes.size).toBe(0)

    fs.mkdirU('/created')
    await fs.flush()
    const createdIid = fs.findInodeU('/created').inode.iid
    expect(new Set(persistence.deltas.at(- 1)?.puts.keys())).toEqual(new Set([rootIid, createdIid]))

    fs.rmU('/file')
    await fs.flush()
    expect([...persistence.deltas.at(- 1)?.puts.keys() ?? []]).toEqual([rootIid])
    expect(persistence.deltas.at(- 1)?.deletes).toEqual(new Set([fileIid]))

    fs.reset()
    expect(persistence.deltas.at(- 1)?.replaceAll?.rootIid).toBe(fs.root.iid)
    expect(persistence.deltas.at(- 1)?.puts.size).toBe(0)
    expect(persistence.deltas.at(- 1)?.deletes.size).toBe(0)
  })

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
    expect(persistence.load()?.inodes.some(({ iid }) => iid === temporaryIid)).toBe(false)
  })

  it('persists files created after the initial image', async () => {
    const persistence = new MemoryFsPersistence()
    const image = Vfs.dir({})
    const firstBoot = new Fs(image, { persistence })
    firstBoot.openU('/save', 'w').handle.write('progress')
    await firstBoot.flush()

    const secondBoot = new Fs(image, { persistence })

    expect(secondBoot.openU('/save', 'r').handle.read()).toBe('progress')
  })

  it('mounts a fresh read-only image over a persisted path', async () => {
    const persistence = new MemoryFsPersistence()
    const image = Vfs.dir({ bin: Vfs.dir({ old: Vfs.normal('persisted') }) })
    const firstBoot = new Fs(image, { persistence })
    firstBoot.openU('/save', 'w').handle.write('progress')
    await firstBoot.flush()
    const mountedBoot = new Fs(image, {
      persistence,
      mounts: [{
        path: '/bin',
        image: Vfs.dir({ 'new-command': Vfs.nativeExe('new-command') }),
        readOnly: true,
      }],
    })

    expect(mountedBoot.find('/bin/old').isErr).toBe(true)
    expect(mountedBoot.findInodeU('/bin/new-command').inode.executable).toEqual({
      format: 'native',
      programId: 'new-command',
    })
    expect(mountedBoot.openU('/save', 'r').handle.read()).toBe('progress')
    expect(mountedBoot.getChildren(mountedBoot.root.file).map(({ name }) => name)).toContain('bin')

    const writeResult = mountedBoot.open('/bin/new-command', 'w')
    const createResult = mountedBoot.mkdir('/bin/new-dir')
    const removeResult = mountedBoot.rm('/bin/new-command')
    expect(writeResult.isErr && writeResult.err.type).toBe(FOp.T.READ_ONLY_FILE_SYSTEM)
    expect(createResult.isErr && createResult.err.type).toBe(FOp.T.READ_ONLY_FILE_SYSTEM)
    expect(removeResult.isErr && removeResult.err.type).toBe(FOp.T.READ_ONLY_FILE_SYSTEM)

    mountedBoot.reset()
    expect(mountedBoot.findInodeU('/bin/new-command').inode.executable?.programId).toBe('new-command')
    expect(mountedBoot.find('/save').isErr).toBe(true)
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
