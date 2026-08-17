import { Vfs } from '@/sys0/fs/vfs'
import { range } from '@/utils'

export const getSysImage = (programNames: readonly string[]) => Vfs.dir({
  bin: Vfs.dir(
    Object.fromEntries(programNames.map(name => [name, Vfs.jsExe(name)])),
  ),
  home: Vfs.dir({
    'test': Vfs.dir(Object.fromEntries(
      range(1, 30)
        .map(i => [`file-${i.toString().padStart(3 + Math.trunc(i / 3), '0')}.txt`, Vfs.normal(`${i}`)]),
    )),
    'hello.txt': Vfs.normal('Hello, world!'),
  }),
})
