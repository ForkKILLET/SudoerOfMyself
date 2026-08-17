import { Program } from '@/sys0/program'
import { hsh, PROGRAMS } from '.'
import { pick } from '@/utils'

const hook = async <T extends object, R>(
  object: T,
  overwrite: Partial<T>,
  run: (object: T) => R,
): Promise<Awaited<R>> => {
  const keys = Object.keys(overwrite) as Array<keyof T>
  const original = pick(object, keys)
  Object.assign(object, overwrite)
  try {
    return await run(object)
  }
  finally {
    Object.assign(object, original)
  }
}

export const hsh1: Program = (proc, name, ...args) => hook(
  PROGRAMS,
  {
    help: (proc) => {
      proc.stdio.writeLn('You are helpless. jaja.')
      return 66
    },
  },
  () => hsh(proc, name, ...args),
)
