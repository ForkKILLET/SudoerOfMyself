import { wrapProgram } from '@/sys0/program'

export const pwd = wrapProgram((proc) => {
    proc.stdio.writeLn(proc.env.PWD)
    return 0
})
