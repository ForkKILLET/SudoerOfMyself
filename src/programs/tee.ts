import { createCommand } from '@/sys0/program'
import { signalExit } from '@/sys0/process_exit'

export const tee = createCommand('tee', '[FILE...]', 'Copy standard input to each FILE, and also to standard output.')
  .help('help')
  .option('append', '-a, --append', 'boolean', 'Append to the given FILEs, do not overwrite')
  .program(async ({ proc, options }, ...paths) => {
    const mode = options.append ? 'a' : 'w'
    const outputs = paths.map(path => proc.ctx.fs.openU(path, mode).handle)
    const abortController = new AbortController()
    const interruptSubscription = proc.on('interrupt', () => abortController.abort())

    try {
      while (true) {
        const data = await proc.stdio.readKey({ signal: abortController.signal })
        if (abortController.signal.aborted) return signalExit('SIGINT')
        if (data === '\x04') return 0

        proc.stdio.write(data)
        outputs.forEach(output => output.write(data))
      }
    }
    finally {
      interruptSubscription.dispose()
    }
  })
