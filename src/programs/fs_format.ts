import { wrapProgram } from '@/sys0/program'

export const fs_format = wrapProgram(async (proc) => {
  proc.staticName = 'fs_format'
  proc.ctx.fs.reset()
  await proc.ctx.fs.flush()
  proc.stdio.writeLn('File system formatted')
  return 0
})
