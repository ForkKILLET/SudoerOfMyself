import { FileT, FOp } from '@/sys0/fs'
import { Path } from '@/sys0/fs/path'
import { createCommand } from '@/sys0/program'
import { UserError } from '@/utils/errors'

export const mv = createCommand('mv', '<SOURCE...> DIRECTORY | SOURCE DEST', 'Move or rename files.')
  .help('help')
  .option('interactive', '--interactive, -i', 'boolean', 'Prompt before overwriting')
  .option('force', '--force, -f', 'boolean', 'Do not prompt before overwriting')
  .program(async ({ proc, options }, ...paths) => {
    proc.staticName = 'mv'
    if (paths.length < 2) throw new UserError('Missing destination operand')

    const targetPath = paths.pop() as string
    const targetDirectoryResult = proc.ctx.fs.findInode(targetPath, {
      allowedTypes: [FileT.DIR],
      cwd: proc.cwd,
    })
    if (paths.length > 1 && targetDirectoryResult.isErr) {
      throw new UserError(`Target '${targetPath}' is not a directory`)
    }
    const targetDirectory = targetDirectoryResult.isOk
      ? targetDirectoryResult.val.path
      : undefined
    const errors: string[] = []

    for (const sourcePath of paths) {
      const sourceResult = proc.ctx.fs.findInode(sourcePath, { cwd: proc.cwd })
      if (sourceResult.isErr) {
        errors.push(`Cannot move '${sourcePath}': ${FOp.displayError(sourceResult.err)}`)
        continue
      }
      const destination = targetDirectory !== undefined
        && targetDirectory !== sourceResult.val.path
        ? Path.join(targetDirectory, sourceResult.val.filename)
        : Path.resolve(targetPath, proc.cwd)
      const existingTarget = proc.ctx.fs.findInode(destination, { cwd: '/' })
      if (
        existingTarget.isOk
        && existingTarget.val.inode !== sourceResult.val.inode
        && options.interactive
        && ! options.force
        && ! await proc.stdio.prompt(`Overwrite '${destination}'?`)
      ) continue

      const result = proc.ctx.fs.rename(sourceResult.val.path, destination, '/')
      if (result.isErr) {
        errors.push(`Cannot move '${sourcePath}' to '${destination}': ${FOp.displayError(result.err)}`)
      }
    }

    errors.forEach(error => proc.error(error))
    return errors.length ? 1 : 0
  })
