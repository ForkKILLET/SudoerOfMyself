import { Vfs } from '@/sys0/fs/vfs'
import { FileT, FOp, FsMigration } from '@/sys0/fs'
import { range } from '@/utils'

export const getSysImage = (programNames: readonly string[]) => Vfs.dir({
  bin: Vfs.dir(
    Object.fromEntries(programNames.map(name => [name, Vfs.nativeExe(name)])),
  ),
  home: Vfs.dir({
    'test': Vfs.dir(Object.fromEntries(
      range(1, 30)
        .map(i => [`file-${i.toString().padStart(3 + Math.trunc(i / 3), '0')}.txt`, Vfs.normal(`${i}`)]),
    )),
    'hello.txt': Vfs.normal('Hello, world!'),
  }),
})

export const SYSTEM_FS_MIGRATIONS: readonly FsMigration[] = [
  {
    version: 1,
    migrate: (fs) => {
      const binResult = fs.findInode('/bin', { allowedTypes: [FileT.DIR] })
      if (binResult.isErr) return binResult
      const bin = binResult.val.inode
      if ('cpu_burn' in bin.file.entries) return FOp.ok(undefined)

      const created = fs.createAt(bin, 'cpu_burn', Vfs.nativeExe('cpu_burn'))
      return created.isErr ? created : FOp.ok(undefined)
    },
  },
  {
    version: 2,
    migrate: (fs) => {
      fs.inodes.forEach((inode) => {
        const legacyFile = inode.file as unknown as {
          type?: number
          programName?: unknown
        }
        if (legacyFile.type !== 2 || typeof legacyFile.programName !== 'string') return

        inode.file = { type: FileT.NORMAL, content: '' }
        inode.executable = { format: 'native', programId: legacyFile.programName }
        fs.persistence.set(inode.iid, inode)
      })
      return FOp.ok(undefined)
    },
  },
]
