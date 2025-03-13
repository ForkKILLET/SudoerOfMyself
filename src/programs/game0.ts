import { Process } from '@/sys0/proc'
import { Program } from '@/sys0/program'
import { hsh1 } from './hsh1'

export const game0: Program = async (proc: Process) => {
    const { stdio } = proc
    stdio.writeLn('Welcome to HumanOS.')
    await proc.spawn(hsh1, { name: 'hsh' })
    return 0
}
