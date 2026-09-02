import { Context } from '@/sys0/context'
import { FileT, FOp } from '@/sys0/fs'
import { Path } from '@/sys0/fs/path'
import { createCommand } from '@/sys0/program'
import { Awaitable } from '@/utils/types'
import { UserError } from '@/utils/errors'

interface CopyOptions {
  recursive: boolean
  confirmOverwrite?: (path: string) => Awaitable<boolean>
  onError(source: string, target: string, error: FOp.Error): void
}

const copyEntry = async (
  ctx: Context,
  sourcePath: string,
  targetPath: string,
  options: CopyOptions,
): Promise<boolean> => {
  const sourceResult = ctx.fs.findInode(sourcePath, { cwd: '/' })
  if (sourceResult.isErr) {
    options.onError(sourcePath, targetPath, sourceResult.err)
    return false
  }
  const source = sourceResult.val.inode
  const targetResult = ctx.fs.findInode(targetPath, { cwd: '/' })

  if (source.file.type === FileT.DIR) {
    if (! options.recursive) {
      options.onError(sourcePath, targetPath, { type: FOp.T.IS_A_DIR })
      return false
    }
    if (targetPath === sourceResult.val.path || targetPath.startsWith(`${sourceResult.val.path}/`)) {
      options.onError(sourcePath, targetPath, { type: FOp.T.INVALID_ARGUMENT })
      return false
    }
    if (targetResult.isOk && targetResult.val.inode.file.type !== FileT.DIR) {
      options.onError(sourcePath, targetPath, { type: FOp.T.NOT_DIR })
      return false
    }
    if (targetResult.isErr) {
      if (targetResult.err.type !== FOp.T.NOT_FOUND) {
        options.onError(sourcePath, targetPath, targetResult.err)
        return false
      }
      const created = ctx.fs.mkdir(targetPath)
      if (created.isErr) {
        options.onError(sourcePath, targetPath, created.err)
        return false
      }
    }

    let succeeded = true
    for (const child of ctx.fs.getChildren(source.file)) {
      const childSource = Path.join(sourceResult.val.path, child.name)
      const childTarget = Path.join(targetPath, child.name)
      succeeded = await copyEntry(ctx, childSource, childTarget, options) && succeeded
    }
    return succeeded
  }

  if (targetResult.isOk) {
    if (targetResult.val.inode === source) {
      options.onError(sourcePath, targetPath, { type: FOp.T.INVALID_ARGUMENT })
      return false
    }
    if (targetResult.val.inode.file.type === FileT.DIR) {
      options.onError(sourcePath, targetPath, { type: FOp.T.IS_A_DIR })
      return false
    }
    if (options.confirmOverwrite && ! await options.confirmOverwrite(targetPath)) return true
  }
  else if (targetResult.err.type !== FOp.T.NOT_FOUND) {
    options.onError(sourcePath, targetPath, targetResult.err)
    return false
  }

  const opened = ctx.fs.open(targetPath, 'w', '/')
  if (opened.isErr) {
    options.onError(sourcePath, targetPath, opened.err)
    return false
  }
  opened.val.handle.write(source.file.content)
  const executable = ctx.fs.setExecutable(targetPath, source.executable, '/')
  if (executable.isErr) {
    options.onError(sourcePath, targetPath, executable.err)
    return false
  }
  return true
}

const targetFor = (
  source: { filename: string, path: string },
  targetDirectory: string | undefined,
  targetPath: string,
  cwd: string,
) => {
  const resolvedTarget = Path.resolve(targetPath, cwd)
  if (resolvedTarget === source.path) return resolvedTarget
  return targetDirectory === undefined
    ? resolvedTarget
    : Path.join(targetDirectory, source.filename)
}

export const cp = createCommand('cp', '<SOURCE...> DIRECTORY | SOURCE DEST', 'Copy files and directories.')
  .help('help')
  .option('recursive', '--recursive, -r', 'boolean', 'Copy directories recursively')
  .option('interactive', '--interactive, -i', 'boolean', 'Prompt before overwriting')
  .option('force', '--force, -f', 'boolean', 'Do not prompt before overwriting')
  .program(async ({ proc, options }, ...paths) => {
    proc.staticName = 'cp'
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
        errors.push(`Cannot copy '${sourcePath}': ${FOp.displayError(sourceResult.err)}`)
        continue
      }
      if (! sourceResult.val.filename) {
        errors.push(`Cannot copy '${sourcePath}': ${FOp.displayError({ type: FOp.T.IS_ROOT })}`)
        continue
      }
      const source = {
        filename: sourceResult.val.filename,
        path: sourceResult.val.path,
      }
      const destination = targetFor(source, targetDirectory, targetPath, proc.cwd)
      await copyEntry(proc.ctx, source.path, destination, {
        recursive: options.recursive ?? false,
        confirmOverwrite: options.interactive && ! options.force
          ? path => proc.stdio.prompt(`Overwrite '${path}'?`)
          : undefined,
        onError: (source, target, error) => {
          errors.push(`Cannot copy '${source}' to '${target}': ${FOp.displayError(error)}`)
        },
      })
    }

    errors.forEach(error => proc.error(error))
    return errors.length ? 1 : 0
  })
