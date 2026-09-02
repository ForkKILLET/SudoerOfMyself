import { createCommand } from '@/sys0/program'
import { ProcessSignal } from '@/sys0/process_exit'
import { UserError } from '@/utils/errors'
import { parseJobId } from './job_ref'

type KillSignal = ProcessSignal | 0

const SIGNALS: Record<string, KillSignal> = {
  0: 0,
  2: 'SIGINT',
  9: 'SIGKILL',
  15: 'SIGTERM',
  INT: 'SIGINT',
  KILL: 'SIGKILL',
  TERM: 'SIGTERM',
  SIGINT: 'SIGINT',
  SIGKILL: 'SIGKILL',
  SIGTERM: 'SIGTERM',
}

export const parseSignal = (value: string) => SIGNALS[value.toUpperCase()]

const parsePid = (value: string) => {
  const pid = Number(value)
  return Number.isSafeInteger(pid) && pid > 0 ? pid : null
}

export const kill = createCommand('kill', '[OPTIONS] PID | %JOB...', 'Send a signal to a process or job.')
  .help('help')
  .option('signal', '--signal, -s', 'string', 'Specify the signal to send')
  .whenUnknownOption('make-arg')
  .program(({ proc, options }, ...targets) => {
    let signal: KillSignal = 'SIGTERM'
    if (options.signal !== undefined) {
      const parsed = parseSignal(options.signal)
      if (parsed === undefined) throw new UserError(`Unknown signal: ${options.signal}`)
      signal = parsed
    }
    else if (targets[0]?.startsWith('-')) {
      const signalArg = targets[0].slice(1)
      const parsed = parseSignal(signalArg)
      if (parsed === undefined) throw new UserError(`Unknown signal: ${signalArg}`)
      signal = parsed
      targets.shift()
    }

    if (! targets.length) throw new UserError('Missing process or job operand')

    let hasError = false
    targets.forEach((target) => {
      const jobId = parseJobId(target)
      if (jobId !== null) {
        const job = proc.jobTable?.get(jobId)
        if (! job || ! job.group.size) {
          proc.error(`${target}: no such active job`)
          hasError = true
          return
        }
        if (signal !== 0) job.group.sendSignal(signal)
        return
      }

      const pid = parsePid(target)
      if (pid === null) {
        proc.error(`${target}: invalid PID or job`)
        hasError = true
        return
      }
      const exists = proc.ctx.processes.has(pid)
      if (! exists || (signal !== 0 && ! proc.ctx.processes.sendSignal(pid, signal))) {
        proc.error(`${target}: no such process`)
        hasError = true
      }
    })

    return hasError ? 1 : 0
  })
