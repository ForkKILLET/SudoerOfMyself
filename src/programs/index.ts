import { Program } from '@/sys0/program'

import { cat } from './cat'
import { fs_inodemap } from './fs_inodemap'
import { fs_format } from './fs_format'
import { ls } from './ls'
import { mkdir } from './mkdir'
import { pwd } from './pwd'
import { rm } from './rm'

import { cd } from './cd'
import { echo } from './echo'
import { hsh_tokenize } from './hsh_tokenize'
import { hsh } from './hsh'

export const PROGRAMS = {
    cat,
    fs_inodemap,
    fs_format,
    ls,
    mkdir,
    rm,
    hsh,
}

export const BUILTINS: Record<string, Program> = {
    cd,
    echo,
    hsh_tokenize,
    pwd,
}

export type ProgramName = keyof typeof PROGRAMS
