import { Program } from '@/sys0/program'

export const echo: Program = async (proc, _, ...argv) => {
    proc.stdio.writeLn(argv.join(' '))
    return 0
}