import { MAX_INODE_COUNT } from '@/sys0/fs'
import { Program } from '@/sys0/program'

export const fs_inodemap: Program = (proc) => {
    const { stdio, ctx } = proc
    stdio.writeLn(`${ctx.fs.inodeBitmap.usedCount}/${MAX_INODE_COUNT} inode used`)
    return 0
}