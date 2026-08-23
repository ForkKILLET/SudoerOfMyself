import { Vfs } from '@/sys0/fs/vfs'
import { range } from '@/utils'

export const getRootImage = () => Vfs.dir({
  home: Vfs.dir({
    'test': Vfs.dir(Object.fromEntries(
      range(1, 30)
        .map(i => [`file-${i.toString().padStart(3 + Math.trunc(i / 3), '0')}.txt`, Vfs.normal(`${i}`)]),
    )),
    'hello.txt': Vfs.normal('Hello, world!'),
  }),
})

export const getBinImage = (programNames: readonly string[]) => Vfs.dir(
  Object.fromEntries(programNames.map(name => [name, Vfs.nativeExe(name)])),
)
