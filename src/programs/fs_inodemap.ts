import { MAX_INODE_COUNT } from '@/sys0/fs'
import { Program } from '@/sys0/program'
import { toPercent } from '@/utils'

export const fs_inodemap: Program = (proc) => {
  const { stdio, ctx } = proc
  proc.staticName = 'fs_inodemap'
  const used = ctx.fs.inodeBitmap.usedCount
  const total = MAX_INODE_COUNT
  stdio.writeLn(`${used}/${total} (${toPercent(used / total, 2)}) inodes used`)
  return 0
}
