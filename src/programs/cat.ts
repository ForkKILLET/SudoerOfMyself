import { createCommand } from '@/sys0/program'
import chalk from 'chalk'

export const cat = createCommand('cat', '<file...>', 'Concatenate file(s) to standard output.')
    .help('help')
    .usage('With no <file>, or when <file> is -, read standard input.')
    .program(async ({ proc }, ...paths) => {
        if (! paths.length) paths.push('-')

        const { stdio, ctx } = proc
        const eol = chalk.blackBright(chalk.bgWhiteBright('%')) + '\n'
        const writeEolBy = (str: string) => {
            if (! str.endsWith('\n')) stdio.stdout?.write(eol)
        }

        let hasError = false
        for (const path of paths) {
            if (path === '-') {
                const data = await stdio.read()
                stdio.write(data)
                writeEolBy(data)
                return 0
            }
            try {
                const fh = ctx.fs.openU(path, 'r').handle
                const data = fh.read()
                stdio.write(data)
                writeEolBy(data)
            }
            catch (err) {
                proc.error(err as string)
                hasError = true
            }
        }

        return hasError ? 1 : 0
    })
