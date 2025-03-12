import { createCommand } from '@/sys0/program'
import { GridDisplay } from '@/sys0/display'
import { DirFile, FileLoc, FileT } from '@/sys0/fs'
import { prop } from '@/utils'
import chalk from 'chalk'

export const ls = createCommand('ls', '<path...>', 'List directory contents')
    .help('help')
    .option('all', '--all, -a', 'boolean', 'Show hidden files')
    .option('color', '--color, -c', 'boolean', 'Colorize the output')
    .program(({ proc, options }, ...paths) => {
        const { stdio, ctx } = proc
        proc.staticName = 'ls'

        options.color ??= true

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
            outputs.push(new GridDisplay(ctx.term, otherEntries.map(prop('path'))).toString())

        outputs.push(...dirEntries.map(({ file: dir, path }) => (
            (paths.length > 1 ? `${path}:\n` : '') + new GridDisplay(
                ctx.term,
                Object.keys(dir.entries)
                    .filter(name => options.all || ! name.startsWith('.'))
                    .map(name => {
                        if (! options.color) return name
                        const child = ctx.fs.getChild(dir, name)
                        let display = name
                        if (! child) {
                            display = chalk.redBright(display)
                        }
                        else if (child.type === FileT.DIR) {
                            display = chalk.blueBright(display) + '/'
                        }
                        else if (child.type === FileT.JSEXE) {
                            display = chalk.greenBright(display) + '*'
                        }
                        return display
                    })
            )
        )))

        stdio.write(outputs.join('\n'))

        return errs.length ? 1 : 0
    })
