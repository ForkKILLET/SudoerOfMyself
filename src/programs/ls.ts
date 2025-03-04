import { wrapProgram } from '@/sys0/program'
import { displayList } from '@/sys0/display'
import { DirFile, FileEntry, FileT } from '@/sys0/fs'

export const ls = wrapProgram((proc, _, ...paths) => {
    const { stdio, ctx } = proc

    const entries: FileEntry[] = []
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
        .divideWith((entry): entry is FileEntry<DirFile> => entry.file.type === FileT.DIR)
    
    const outputs: string[] = []
    if (otherEntries.length)
        outputs.push(displayList(ctx.term, otherEntries.map(entry => entry.path)))

    outputs.push(...dirEntries.map(({ file, path }) => (
        (paths.length > 1 ? `${path}:\n` : '')
            + displayList(ctx.term, Object.keys(file.children))
    )))

    stdio.write(outputs.join('\n'))

    return errs.length ? 1 : 0
})

export default ls