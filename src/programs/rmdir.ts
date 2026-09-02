import { FileT, FOp } from '@/sys0/fs'
import { Path } from '@/sys0/fs/path'
import { createCommand } from '@/sys0/program'
import { UserError } from '@/utils/errors'

export const rmdir = createCommand('rmdir', '<DIRECTORY...>', 'Remove empty directories.')
  .help('help')
  .option('parents', '--parents, -p', 'boolean', 'Remove DIRECTORY and its empty ancestors')
  .option('verbose', '--verbose, -v', 'boolean', 'Explain what is being done')
  .program(({ proc, options }, ...paths) => {
    proc.staticName = 'rmdir'
    if (! paths.length) throw new UserError('Missing operand')

    const errors: string[] = []
    paths.forEach((path) => {
      let current = Path.resolve(path, proc.cwd)
      if (current === '/') {
        errors.push(`Cannot remove '${current}': ${FOp.displayError({ type: FOp.T.IS_ROOT })}`)
        return
      }
      while (current !== '/') {
        const found = proc.ctx.fs.findInode(current, { allowedTypes: [FileT.DIR], cwd: '/' })
        if (found.isErr) {
          errors.push(`Cannot remove '${current}': ${FOp.displayError(found.err)}`)
          break
        }
        if (! proc.ctx.fs.isEmptyDir(found.val.inode.file)) {
          errors.push(`Cannot remove '${current}': ${FOp.displayError({ type: FOp.T.DIRECTORY_NOT_EMPTY })}`)
          break
        }
        const removed = proc.ctx.fs.rm(current)
        if (removed.isErr) {
          errors.push(`Cannot remove '${current}': ${FOp.displayError(removed.err)}`)
          break
        }
        if (options.verbose) proc.stdio.writeLn(`Removed directory '${current}'`)
        if (! options.parents) break
        current = Path.normalize(Path.getDirAndName(current).dirname)
      }
    })

    errors.forEach(error => proc.error(error))
    return errors.length ? 1 : 0
  })
