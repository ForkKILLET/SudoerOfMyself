import { FsBuilder as Fb, DirFile } from '@/sys0/fs'

import ls from '@/programs/ls'
import pwd from '@/programs/pwd'
import mkdir from '@/programs/mkdir'
import cat from '@/programs/cat'
import { fs_inodemap } from '@/programs/fs_inodemap'

export const getSysImage = () => Fb.dir({
    bin: Fb.dir({
        pwd: Fb.jsExe(pwd),
        ls: Fb.jsExe(ls),
        mkdir: Fb.jsExe(mkdir),
        cat: Fb.jsExe(cat),
        fs_inodemap: Fb.jsExe(fs_inodemap),
    }),
    home: Fb.dir({
        test: Fb.dir(Object.fromEntries(Array
            .range(1, 30)
            .map(i => [ `file-${i.toString().padStart(3 + Math.trunc(i / 3), '0')}.txt`, Fb.normal(`${i}`) ])
        )),
        'hello.txt': Fb.normal('Hello, world!'),
    }),
})