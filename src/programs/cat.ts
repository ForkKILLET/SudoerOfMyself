import { wrapProgram } from '@/sys0/program'
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
            const { content } = ctx.fs.readU(path)
            stdio.write(content + (content.endsWith('\n')
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

export default cat