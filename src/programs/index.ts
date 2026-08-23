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
import { createHsh } from './hsh'
import { createHelp } from './help'
import { cpu_burn } from './cpu_burn'
import { tee } from './tee'
import { ps } from './ps'

export const BUILTINS: Record<string, Program> = {
  cd,
  echo,
  hsh_tokenize,
  pwd,
}

export const hsh = createHsh({
  builtins: BUILTINS,
})

export const help = createHelp(hsh)

export const NATIVE_PROGRAMS: Record<string, Program> = {
  cat,
  cpu_burn,
  fs_inodemap,
  fs_format,
  ls,
  mkdir,
  ps,
  rm,
  tee,
  hsh,
  help,
}
