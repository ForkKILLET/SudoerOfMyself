import { wrapProgram } from '@/sys0/program'

export const fs_format = wrapProgram(proc => {
    proc.ctx.fs.reset()
    proc.stdio.writeLn('File system formatted')
    return 0
})

export default fs_format