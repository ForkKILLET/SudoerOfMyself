import { displayFileT, FileStat, FOp } from '@/sys0/fs'
import { createCommand } from '@/sys0/program'
import { UserError } from '@/utils/errors'
import { formatStrftime } from '@/sys0/time_format'
import { formatFileMode, formatOctalMode } from '@/sys0/fs/file_mode'

const formatTimestamp = (timestamp: number, timezone: string) => (
  formatStrftime('%Y-%m-%d %H:%M:%S %z', timestamp, timezone)
)

export const formatFileStat = (
  path: string,
  stat: FileStat,
  timezone = 'UTC',
  owner = stat.uid.toString(),
  group = stat.gid.toString(),
) => [
  `  File: ${path}`,
  `  Size: ${stat.size.toString().padEnd(10)} Type: ${displayFileT(stat.type)}`,
  `Device: human-os   Inode: ${stat.iid}`,
  `Access: (${formatOctalMode(stat.mode)}/${formatFileMode(stat.mode, stat.type)})  `
  + `Uid: (${stat.uid.toString().padStart(5)}/${owner})  `
  + `Gid: (${stat.gid.toString().padStart(5)}/${group})`,
  ` Birth: ${formatTimestamp(stat.createdAt, timezone)}`,
  `Modify: ${formatTimestamp(stat.modifiedAt, timezone)}`,
].join('\n')

export const stat = createCommand('stat', '<FILE...>', 'Display file status.')
  .help('help')
  .program(({ proc }, ...paths) => {
    proc.staticName = 'stat'
    if (! paths.length) throw new UserError('Missing operand')

    const output: string[] = []
    const errors: string[] = []
    paths.forEach((path) => {
      const result = proc.fs.stat(path, proc.cwd)
      if (result.isErr) {
        errors.push(`Cannot stat '${path}': ${FOp.displayError(result.err)}`)
        return
      }
      const owner = proc.ctx.accounts.getUserById(result.val.uid)?.name
      const group = proc.ctx.accounts.getGroupById(result.val.gid)?.name
      output.push(formatFileStat(
        path,
        result.val,
        proc.ctx.time?.game.timezone ?? 'UTC',
        owner,
        group,
      ))
    })

    if (output.length) proc.stdio.writeLn(output.join('\n'))
    errors.forEach(error => proc.error(error))
    return errors.length ? 1 : 0
  })
