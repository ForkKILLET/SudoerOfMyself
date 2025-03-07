import { wrapProgram } from '@/sys0/program'
import { GridDisplay } from '@/sys0/display'
import { DirFile, FileLoc, FileT } from '@/sys0/fs'

export const ls = wrapProgram((proc, _, ...paths) => {
    const { stdio, ctx } = proc

    const entries: FileLoc[] = []
    const errs: string[] = []

    if (! paths.length) paths.push('')
    paths.forEach(path => {
        try {
            const { file } = ctx.fs.findU(path)
            entries.push({ file, path })
        }
        catch (err) {
            errs.push(err as string)
        }
    })

    proc.error(errs)

    const [ dirEntries, otherEntries ] = entries
        .divideWith((entry): entry is FileLoc<DirFile> => entry.file.type === FileT.DIR)
    
    const outputs: string[] = []
    if (otherEntries.length)
        outputs.push(new GridDisplay(ctx.term, otherEntries.map(entry => entry.path)).toString())

    outputs.push(...dirEntries.map(({ file, path }) => (
        (paths.length > 1 ? `${path}:\n` : '')
            + new GridDisplay(ctx.term, Object.keys(file.entries))
    )))

    stdio.write(outputs.join('\n'))

    return errs.length ? 1 : 0
})
