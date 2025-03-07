import { wrapProgram } from '@/sys0/program'
import { kStdout } from '@/sys0/stdio'
import chalk from 'chalk'

export const cat = wrapProgram((proc, _, ...paths) => {
    if (! paths.length) {
        proc.error('Reading from stdin is not implemented')
        return 1
    }

    const { stdio, ctx } = proc

    let hasError = false
    paths.forEach(path => {
        try {
            const fh = ctx.fs.openU(path, 'r').handle
            const content = fh.read()
            stdio.write(content + (content.endsWith('\n') || ! (kStdout in stdio.output)
                ? ''
                : chalk.blackBright(chalk.bgWhiteBright('%')) + '\n'
            ))
        }
        catch (err) {
            proc.error(err as string)
            hasError = true
        }
    })

    return hasError ? 1 : 0
})
