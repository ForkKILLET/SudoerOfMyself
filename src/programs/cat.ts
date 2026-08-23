import { createCommand } from '@/sys0/program'
import { chalk } from '@/utils/color'
import { signalExit } from '@/sys0/process_exit'

export const cat = createCommand('cat', '<FILE...>', 'Concatenate FILE(s) to standard output.')
  .help('help')
  .usage('With no FILE, or when FILE is -, read standard input.')
  .program(async ({ proc }, ...paths) => {
    proc.staticName = 'cat'
    const { stdio, ctx } = proc

    const eol = chalk.blackBright(chalk.bgWhiteBright('%')) + '\n'
    const writeEolBy = (str: string) => {
      if (! str.endsWith('\n')) stdio.stdout?.write(eol)
    }

    let hasError = false

    if (! paths.length) paths.push('-')
    for (const path of paths) {
      if (path === '-') {
        const abortController = new AbortController()
        const signalSubscription = proc.on('signal', (signal) => {
          if (signal === 'SIGINT') abortController.abort()
        })
        let data: string
        try {
          data = await stdio.read({ signal: abortController.signal })
        }
        finally {
          signalSubscription.dispose()
        }
        if (abortController.signal.aborted) return signalExit('SIGINT')
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
        proc.error(err)
        hasError = true
      }
    }

    return hasError ? 1 : 0
  })
