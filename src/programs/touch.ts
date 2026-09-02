import { FOp } from '@/sys0/fs'
import { createCommand } from '@/sys0/program'
import { UserError } from '@/utils/errors'

export const touch = createCommand('touch', '<FILE...>', 'Update file timestamps, creating files as needed.')
  .help('help')
  .option('noCreate', '--no-create, -c', 'boolean', 'Do not create missing files')
  .program(({ proc, options }, ...paths) => {
    proc.staticName = 'touch'
    if (! paths.length) throw new UserError('Missing operand')

    const errors: string[] = []
    paths.forEach((path) => {
      if (options.noCreate) {
        const existing = proc.ctx.fs.find(path, { cwd: proc.cwd })
        if (existing.isErr && existing.err.type === FOp.T.NOT_FOUND) return
      }
      const result = proc.ctx.fs.touch(path, proc.cwd)
      if (result.isErr) errors.push(`Cannot touch '${path}': ${FOp.displayError(result.err)}`)
    })

    errors.forEach(error => proc.error(error))
    return errors.length ? 1 : 0
  })
