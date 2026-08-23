import { Vfs } from '@/sys0/fs/vfs'
import { FileT, FOp, FsMigration } from '@/sys0/fs'
import { range } from '@/utils'

const installNativeProgram = (name: string): FsMigration['migrate'] => (fs) => {
  const binResult = fs.findInode('/bin', { allowedTypes: [FileT.DIR] })
  if (binResult.isErr) return binResult
  const bin = binResult.val.inode
  if (name in bin.file.entries) return FOp.ok(undefined)

  const created = fs.createAt(bin, name, Vfs.nativeExe(name))
  return created.isErr ? created : FOp.ok(undefined)
}

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
    migrate: installNativeProgram('cpu_burn'),
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
  {
    version: 3,
    migrate: installNativeProgram('tee'),
  },
  {
    version: 4,
    migrate: installNativeProgram('ps'),
  },
]
