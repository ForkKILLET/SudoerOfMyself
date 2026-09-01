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
        try {
          let terminalLine = ''
          while (true) {
            const data = await stdio.readKey({ signal: abortController.signal })
            if (receivedSignal) return signalExit(receivedSignal)

            let reachedEof = false
            for (const inputChar of data) {
              if (inputChar === '\x04') {
                reachedEof = true
                break
              }

              if (! stdio.stdin) {
                stdio.write(inputChar)
                continue
              }

              const char = inputChar === '\r' ? '\n' : inputChar
              if (char === '\n') {
                stdio.writeLn(terminalLine)
                terminalLine = ''
              }
              else if (char === '\x7F') {
                terminalLine = [...terminalLine].slice(0, - 1).join('')
              }
              else {
                terminalLine += char
              }
            }

            if (! reachedEof) continue
            if (terminalLine) stdio.write(terminalLine)
            break
          }
        }
        finally {
          signalSubscription.dispose()
        }
        continue
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
