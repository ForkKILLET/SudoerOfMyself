import { Program } from '@/sys0/program'

import { cat } from './cat'
import { cp } from './cp'
import { fs_inodemap } from './fs_inodemap'
import { fs_format } from './fs_format'
import { ls } from './ls'
import { mkdir } from './mkdir'
import { mv } from './mv'
import { pwd } from './pwd'
import { rm } from './rm'
import { rmdir } from './rmdir'

import { cd } from './cd'
import { echo } from './echo'
import { hsh_tokenize } from './hsh_tokenize'
import { createHsh } from './hsh'
import { createHelp } from './help'
import { cpu_burn } from './cpu_burn'
import { tee } from './tee'
import { touch } from './touch'
import { ps } from './ps'
import { jobs } from './jobs'
import { wait } from './wait'
import { kill } from './kill'
import { sleep } from './sleep'
import { stat } from './stat'
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
import { createEnvCommand } from './env'
import { printenv } from './printenv'
import { readonly } from './readonly'
import { bracket, test } from './test'
import { date } from './date'
import { times } from './times'
import { timeout } from './timeout'
import { uptime } from './uptime'

export const BUILTINS: Record<string, Program> = {
  [':']: succeed,
  ['[']: bracket,
  break: breakLoop,
  cd,
  command: createCommandBuiltin(() => BUILTINS),
  continue: continueLoop,
  echo,
  env: createEnvCommand(() => BUILTINS),
  exit,
  export: exportEnv,
  false: fail,
  hsh_tokenize,
  jobs,
  kill,
  pwd,
  printenv,
  read,
  readonly,
  set,
  shift,
  test,
  type: createTypeCommand(() => BUILTINS),
  unset,
  true: succeed,
  wait,
  times,
}

export const hsh = createHsh({
  builtins: BUILTINS,
})

export const help = createHelp(hsh)

export const NATIVE_PROGRAMS: Record<string, Program> = {
  cat,
  cp,
  cpu_burn,
  date,
  fs_inodemap,
  fs_format,
  ls,
  mkdir,
  mv,
  ps,
  rm,
  rmdir,
  sleep,
  stat,
  tee,
  touch,
  timeout,
  uptime,
  hsh,
  help,
}
