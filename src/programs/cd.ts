import { FileT } from '@/sys0/fs'
import { wrapProgram } from '@/sys0/program'

export const cd = wrapProgram(async (proc, self, ...args) => {
    const { env, ctx } = proc
    if (args.length === 0) return cd(proc, self, env.HOME)
    if (args.length > 1) throw 'Too many arguments'
    const [ path ] = args
    proc.cwd = ctx.fs.findU(path, { allowedTypes: [ FileT.DIR ] }).path
    return 0
})
