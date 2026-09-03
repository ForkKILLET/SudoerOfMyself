import { createCommand } from '@/sys0/program'

export const fs_format = createCommand(
  'fs_format', '', 'Reset the writable file system to its initial state.',
)
  .help('help')
  .program(async ({ proc }) => {
    proc.staticName = 'fs_format'
    proc.ctx.fs.reset()
    await proc.ctx.fs.flush()
    proc.stdio.writeLn('File system formatted')
    return 0
  })
