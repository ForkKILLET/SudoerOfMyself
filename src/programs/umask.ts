import { createCommand } from '@/sys0/program'
import { formatOctalMode } from '@/sys0/fs/file_mode'
import { UserError } from '@/utils/errors'

export const umask = createCommand('umask', '[MASK]', 'Set or display the file mode creation mask.')
  .help('help')
  .program(({ proc }, value, ...rest) => {
    proc.staticName = 'umask'
    if (rest.length) throw new UserError('Too many arguments')
    if (value === undefined) {
      proc.stdio.writeLn(formatOctalMode(proc.umask))
      return 0
    }
    if (! /^[0-7]{1,4}$/u.test(value)) throw new UserError(`Invalid mask: '${value}'`)
    const mask = Number.parseInt(value, 8)
    if (mask > 0o777) throw new UserError(`Invalid mask: '${value}'`)
    proc.umask = mask
    return 0
  })
