import { createCommand } from '@/sys0/program'
import { normalExit, ProcessExit, signalExit } from '@/sys0/process_exit'
import { UserError } from '@/utils/errors'
import { parseDurationMilliseconds } from './duration'

export const sleep = createCommand('sleep', 'SECONDS', 'Delay for a specified amount of time.')
  .help('help')
  .whenUnknownOption('make-arg')
  .program(({ proc }, ...args) => {
    proc.staticName = 'sleep'
    if (! args.length) throw new UserError('Missing duration operand')
    if (args.length > 1) throw new UserError('Too many operands')

    const [durationArg] = args
    const durationMilliseconds = parseDurationMilliseconds(durationArg)
    if (durationMilliseconds === null) {
      throw new UserError(`Invalid duration: ${durationArg}`)
    }

    return new Promise<ProcessExit>((resolve) => {
      let hasFinished = false
      const finish = (exitStatus: ProcessExit) => {
        if (hasFinished) return
        hasFinished = true
        clearTimeout(timer)
        signalSubscription.dispose()
        resolve(exitStatus)
      }
      const timer = setTimeout(() => finish(normalExit(0)), durationMilliseconds)
      const signalSubscription = proc.on('signal', signal => finish(signalExit(signal)))
    })
  })
