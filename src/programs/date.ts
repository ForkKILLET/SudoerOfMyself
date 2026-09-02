import { createCommand } from '@/sys0/program'
import { formatStrftime } from '@/sys0/time_format'
import { UserError } from '@/utils/errors'

const DEFAULT_DATE_FORMAT = '%a %b %e %H:%M:%S %Z %Y'

export const date = createCommand('date', '[+FORMAT]', 'Display the game-world date and time.')
  .help('help')
  .option('utc', '--utc, -u', 'boolean', 'Display time in UTC')
  .program(({ proc, options }, ...args) => {
    proc.staticName = 'date'
    if (args.length > 1) throw new UserError('Extra operand')
    const formatArg = args[0]
    if (formatArg && ! formatArg.startsWith('+')) {
      throw new UserError('Setting the date is not supported')
    }

    const clock = proc.ctx.time.game
    const format = formatArg?.slice(1) ?? DEFAULT_DATE_FORMAT
    const timezone = options.utc ? 'UTC' : clock.timezone
    proc.stdio.writeLn(formatStrftime(format, clock.nowMs(), timezone))
    return 0
  })
