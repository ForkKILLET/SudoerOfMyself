import { createCommand } from '@/sys0/program'
import { isEnvName } from '@/sys0/env'
import { ProcessSignal, signalExit } from '@/sys0/process_exit'

const assignFields = (line: string, names: string[], env: Record<string, string>) => {
  if (names.length === 1) {
    env[names[0]] = line
    return
  }

  const fields = line.trim().split(/\s+/).filter(Boolean)
  names.forEach((name, index) => {
    env[name] = index === names.length - 1
      ? fields.slice(index).join(' ')
      : fields[index] ?? ''
  })
}

export const read = createCommand('read', '[NAME...]', 'Read a line and assign environment variables.')
  .help('help')
  .program(async ({ proc }, ...names) => {
    if (! names.length) names.push('REPLY')
    const invalidName = names.find(name => ! isEnvName(name))
    if (invalidName) {
      proc.error(`${invalidName}: invalid environment variable name`)
      return 1
    }

    const abortController = new AbortController()
    let receivedSignal: ProcessSignal | undefined
    const signalSubscription = proc.on('signal', (signal) => {
      receivedSignal = signal
      abortController.abort()
    })
    let line = ''
    let reachedEof = false
    try {
      while (true) {
        const char = await proc.stdio.readKey({ signal: abortController.signal })
        if (receivedSignal) return signalExit(receivedSignal)
        if (char === '\x04') {
          reachedEof = true
          break
        }
        if (char === '\n' || char === '\r') break
        if (char === '\x7F' || char === '\x08') line = line.slice(0, - 1)
        else line += char
      }
    }
    finally {
      signalSubscription.dispose()
    }

    assignFields(line, names, proc.env)
    return reachedEof ? 1 : 0
  })
