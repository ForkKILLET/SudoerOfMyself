import { createCommand } from '@/sys0/program'
import { ProcessSignal, signalExit } from '@/sys0/process_exit'

export const cat = createCommand('cat', '<FILE...>', 'Concatenate FILE(s) to standard output.')
  .help('help')
  .usage('With no FILE, or when FILE is -, read standard input.')
  .program(async ({ proc }, ...paths) => {
    proc.staticName = 'cat'
    const { stdio, ctx } = proc

    let hasError = false

    if (! paths.length) paths.push('-')
    for (const path of paths) {
      if (path === '-') {
        const abortController = new AbortController()
        let receivedSignal: ProcessSignal | undefined
        const signalSubscription = proc.on('signal', (signal) => {
          receivedSignal = signal
          abortController.abort()
        })
        let data: string
        try {
          data = await stdio.read({ signal: abortController.signal })
        }
        finally {
          signalSubscription.dispose()
        }
        if (receivedSignal) return signalExit(receivedSignal)
        stdio.write(data)
        return 0
      }
      try {
        const fh = ctx.fs.openU(path, 'r').handle
        const data = fh.read()
        stdio.write(data)
      }
      catch (err) {
        proc.error(err)
        hasError = true
      }
    }

    return hasError ? 1 : 0
  })
