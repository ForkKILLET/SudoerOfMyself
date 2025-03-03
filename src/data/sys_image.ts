import { FileBuilder as FB, DirFile } from '@/sys0/fs'

import ls from '@/programs/ls'
import pwd from '@/programs/pwd'
import mkdir from '@/programs/mkdir'
import cat from '@/programs/cat'

export const getSysImage = (): DirFile => {
    return FB.dir({
        bin: FB.dir({
            pwd: FB.jsExe(pwd),
            ls: FB.jsExe(ls),
            mkdir: FB.jsExe(mkdir),
            cat: FB.jsExe(cat),
        }),
        home: FB.dir({
            test: FB.dir(Object.fromEntries(Array
                .range(1, 30)
                .map(i => [`file-${i.toString().padStart(3 + Math.trunc(i / 3), '0')}.txt`, FB.normal(`${i}`)])
            )),
            'hello.txt': FB.normal('Hello, world!'),
        }),
    })
}