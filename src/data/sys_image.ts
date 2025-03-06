import { Vfs } from '@/sys0/fs/vfs'
import { PROGRAMS } from '@/programs'

export const getSysImage = () => Vfs.dir({
    bin: Vfs.dir(
        Object.fromEntries(Object.keys(PROGRAMS).map(name => [ name, Vfs.jsExe(name) ]))
    ),
    home: Vfs.dir({
        test: Vfs.dir(Object.fromEntries(Array
            .range(1, 30)
            .map(i => [ `file-${i.toString().padStart(3 + Math.trunc(i / 3), '0')}.txt`, Vfs.normal(`${i}`) ])
        )),
        'hello.txt': Vfs.normal('Hello, world!'),
    }),
})