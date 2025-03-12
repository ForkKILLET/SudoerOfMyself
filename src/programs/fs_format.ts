import { wrapProgram } from '@/sys0/program'

export const fs_format = wrapProgram(proc => {
    proc.staticName = 'fs_format'
    proc.ctx.fs.reset()
    proc.stdio.writeLn('File system formatted')
    return 0
})
