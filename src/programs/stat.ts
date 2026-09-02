import { displayFileT, FileStat, FOp } from '@/sys0/fs'
import { createCommand } from '@/sys0/program'
import { UserError } from '@/utils/errors'

const formatTimestamp = (timestamp: number) => new Date(timestamp).toISOString()

export const formatFileStat = (path: string, stat: FileStat) => [
  `  File: ${path}`,
  `  Size: ${stat.size.toString().padEnd(10)} Type: ${displayFileT(stat.type)}`,
  ` Inode: ${stat.iid.toString().padEnd(10)} Executable: ${stat.executable ? 'yes' : 'no'}`,
  ` Birth: ${formatTimestamp(stat.createdAt)}`,
  `Modify: ${formatTimestamp(stat.modifiedAt)}`,
].join('\n')

export const stat = createCommand('stat', '<FILE...>', 'Display file status.')
  .help('help')
  .program(({ proc }, ...paths) => {
    proc.staticName = 'stat'
    if (! paths.length) throw new UserError('Missing operand')

    const output: string[] = []
    const errors: string[] = []
    paths.forEach((path) => {
      const result = proc.ctx.fs.stat(path, proc.cwd)
      if (result.isErr) {
        errors.push(`Cannot stat '${path}': ${FOp.displayError(result.err)}`)
        return
      }
      output.push(formatFileStat(path, result.val))
    })

    if (output.length) proc.stdio.writeLn(output.join('\n'))
    errors.forEach(error => proc.error(error))
    return errors.length ? 1 : 0
  })
