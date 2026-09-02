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
import { jobs } from './jobs'
import { wait } from './wait'
import { kill } from './kill'
import { sleep } from './sleep'
import { exit } from './exit'
import { exportEnv } from './export'
import { read } from './read'
import { unset } from './unset'
import { createTypeCommand } from './type'
import { createCommandBuiltin } from './command'
import { breakLoop, continueLoop } from './loop_control'
import { fail, succeed } from './status'
import { set } from './set'
import { shift } from './shift'

export const BUILTINS: Record<string, Program> = {
  [':']: succeed,
  break: breakLoop,
  cd,
  command: createCommandBuiltin(() => BUILTINS),
  continue: continueLoop,
  echo,
  exit,
  export: exportEnv,
  false: fail,
  hsh_tokenize,
  jobs,
  kill,
  pwd,
  read,
  set,
  shift,
  type: createTypeCommand(() => BUILTINS),
  unset,
  true: succeed,
  wait,
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
  sleep,
  tee,
  hsh,
  help,
}
