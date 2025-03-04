import { Process } from '@/sys0/proc'
import { Program } from '@/sys0/program'
import hsh from '@/programs/hsh'

export const game0: Program = async (proc: Process) => {
    const { stdio } = proc
    stdio.writeLn('Welcome to HumanOS.')
    await proc.spawn(hsh, { name: 'hsh' })
    return 0
}

export default game0