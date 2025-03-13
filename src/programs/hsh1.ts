import { Program } from '@/sys0/program'
import { hsh } from './hsh'
import { PROGRAMS } from '.'
import { pick } from '@/utils'

const hook = async <T extends object, R>(obj: T, overwrite: Partial<T>, fn: (obj: T) => R): Promise<Awaited<R>> => {
    const keys = Object.keys(overwrite) as (keyof T)[]
    const original = pick(obj, keys)
    Object.assign(obj, overwrite)
    const ret = await fn(obj)
    Object.assign(obj, original)
    return ret
}

export const hsh1: Program = (proc, name, ...args) => {
    return hook(
        PROGRAMS,
        {
            help: (proc) => {
                proc.stdio.writeLn('You are helpless. jaja.')
                return 66
            }
        },
        () => hsh(proc, name, ...args)
    )
}