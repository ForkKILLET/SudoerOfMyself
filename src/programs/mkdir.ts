import { wrapProgram } from '@/sys0/program'

export const mkdir = wrapProgram(async (proc, _, ...paths) => {
    if (! paths.length) {
        throw 'Missing operand'
    }
    const errs: string[] = []

    for (const path of paths) {
        try {
            proc.ctx.fs.mkdirU(path)
        }
        catch (err) {
            errs.push(err as string)
        }
    }

    if (errs.length) {
        proc.error(errs)
        return 1
    }

    return 0
})

export default mkdir