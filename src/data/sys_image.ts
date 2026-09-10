import { Vfs } from '@/sys0/fs/vfs'
import { range } from '@/utils'
import { DEFAULT_PROFILE } from './profile'
import { HUMAN_GROUP_ID, HUMAN_USER_ID } from '@/sys0/identity'

export const getRootImage = () => Vfs.dir({
  root: Vfs.dir({}, { mode: 0o700 }),
  home: Vfs.dir({
    '.hshrc': Vfs.normal(DEFAULT_PROFILE),
    'test': Vfs.dir(Object.fromEntries(
      range(1, 30)
        .map(i => [`file-${i.toString().padStart(3, '0')}.txt`, Vfs.normal(`${i}`)]),
    )),
    'hello.txt': Vfs.normal('Hello, world!'),
  }, { uid: HUMAN_USER_ID, gid: HUMAN_GROUP_ID, mode: 0o700 }),
})

export const getBinImage = (programNames: readonly string[]) => Vfs.dir(
  Object.fromEntries(programNames.map(name => [name, Vfs.sysExe(name)])),
)
