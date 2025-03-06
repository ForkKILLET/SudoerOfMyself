import cat from './cat'
import fs_inodemap from './fs_inodemap'
import ls from './ls'
import mkdir from './mkdir'
import pwd from './pwd'

export const PROGRAMS = {
    cat,
    fs_inodemap,
    ls,
    mkdir,
    pwd,
}

export type ProgramName = keyof typeof PROGRAMS