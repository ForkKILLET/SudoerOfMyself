import { cat } from './cat'
import { fs_inodemap } from './fs_inodemap'
import { fs_format } from './fs_format'
import { ls } from './ls'
import { mkdir } from './mkdir'
import { pwd } from './pwd'
import { rm } from './rm'

export const PROGRAMS = {
    cat,
    fs_inodemap,
    fs_format,
    ls,
    mkdir,
    pwd,
    rm,
}

export type ProgramName = keyof typeof PROGRAMS