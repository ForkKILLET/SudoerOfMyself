import { ExecErrorT } from '@/sys0/exec'
import { FOp } from '@/sys0/fs'
import { createCommand } from '@/sys0/program'
import { UserError } from '@/utils/errors'
import { parseDurationMilliseconds } from './duration'
import { parseSignal } from './kill'
import { ProcessGroup } from '@/sys0/job'

export const timeout = createCommand(
  'timeout',
  '[OPTIONS] DURATION COMMAND [ARG...]',
  'Run a command with a time limit.',
)
  .help('help')
  .option('signal', '--signal, -s', 'string', 'Signal sent when the limit expires')
  .program(async ({ proc, options }, durationArg, command, ...args) => {
    proc.staticName = 'timeout'
    if (! durationArg) throw new UserError('Missing duration operand')
    if (! command) throw new UserError('Missing command operand')
    const durationMs = parseDurationMilliseconds(durationArg)
    if (durationMs === null) throw new UserError(`Invalid duration: ${durationArg}`)
    const signal = options.signal ? parseSignal(options.signal) : 'SIGTERM'
    if (! signal) throw new UserError(`Invalid signal: ${options.signal}`)

    const resolved = proc.ctx.exec.resolve(command, {
      envPath: proc.env.PATH,
      cwd: proc.cwd,
    })
    if (resolved.isErr) {
      switch (resolved.err.type) {
        case ExecErrorT.NOT_FOUND:
          proc.error(`${command}: Command not found`)
          return 127
        case ExecErrorT.NOT_EXECUTABLE:
          proc.error(`${command}: Not an executable`)
          return 126
        case ExecErrorT.NATIVE_PROGRAM_NOT_REGISTERED:
          proc.error(`${command}: Native program '${resolved.err.programId}' is not registered`)
          return 126
        case ExecErrorT.FILE_SYSTEM_ERROR:
          proc.error(`${command}: ${FOp.displayError(resolved.err.error)}`)
          return 126
      }
    }

    let didTimeout = false
    const processGroup = new ProcessGroup()
    const running = proc.spawn(resolved.val.program, { name: command, processGroup }, ...args)
    const child = proc.subProcesses[0]
    const timer = setTimeout(() => {
      if (! child || child.state === 'exited') return
      didTimeout = true
      processGroup.sendSignal(signal)
    }, durationMs)
    try {
      const status = await running
      return didTimeout ? 124 : status
    }
    finally {
      clearTimeout(timer)
    }
  })
