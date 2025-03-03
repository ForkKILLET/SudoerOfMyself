import { Process } from '@/sys0/proc'
import { Program } from '@/sys0/program'
import hsh from '@/programs/hsh'

export const game0: Program = async (proc: Process) => {
    await proc.spawn(hsh, 'hsh')
    return 0
}

export default game0