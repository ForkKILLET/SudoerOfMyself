import { MAX_INODE_COUNT } from '@/sys0/fs'
import { createCommand } from '@/sys0/program'
import { toPercent } from '@/utils'

export const fs_inodemap = createCommand(
  'fs_inodemap', '', 'Display writable file-system inode allocation.',
)
  .help('help')
  .program(({ proc }) => {
    const { stdio, ctx } = proc
    proc.staticName = 'fs_inodemap'
    const used = ctx.fs.inodeBitmap.usedCount
    const total = MAX_INODE_COUNT
    stdio.writeLn(`${used}/${total} (${toPercent(used / total, 2)}) inodes used`)
    return 0
  })
