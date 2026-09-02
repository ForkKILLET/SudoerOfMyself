import { Context } from '@/sys0/context'
import { DirFile, displayFileT, File, FileT, FOp, Inode } from '@/sys0/fs'
import { Path } from '@/sys0/fs/path'
import { createCommand } from '@/sys0/program'
import { pick } from '@/utils'
import { Awaitable } from '@/utils/types'
import { UserError } from '@/utils/errors'

export interface RmXOptions {
  dir?: boolean
  recursive?: boolean
  force?: boolean
  onErr?: (err: FOp.Error, path: string) => void
  onOk?: (path: string) => void
  onPromptRm?: (type: FileT, path: string) => Awaitable<boolean>
  onPromptEnter?: (path: string) => Awaitable<boolean>
}

const _rmX = async (
  ctx: Context, options: RmXOptions,
  path: string, parentInode: Inode<DirFile>, filename: string, inode: Inode<File>,
): Promise<boolean> => {
  const fail = (err: FOp.Error, path: string) => {
    if (options.force && err.type === FOp.T.NOT_FOUND) return true
    options.onErr?.(err, path)
    return false
  }

  if (ctx.fs.isInodeOfType(inode, [FileT.DIR])) {
    const { file } = inode
    const childnames = ctx.fs.getChildren(file).map(({ name }) => name)
    if (! childnames.length && options.dir) {
      // An empty directory can be removed below without recursive traversal.
    }
    else if (! options.recursive) {
      return fail({ type: FOp.T.IS_A_DIR }, path)
    }
    else {
      if (options.onPromptEnter && ! await options.onPromptEnter(path)) return true

      let childFailed = false
      for (const childname of childnames) {
        const childpath = Path.join(path, childname)
        const childInode = ctx.fs.getChildInode(file, childname)
        if (! childInode) {
          childFailed = ! fail({ type: FOp.T.NOT_FOUND }, childpath) || childFailed
          continue
        }
        childFailed = ! await _rmX(ctx, options, childpath, inode, childname, childInode) || childFailed
      }

      if (childFailed) return false
    }
  }

  if (options.onPromptRm && ! await options.onPromptRm(inode.file.type, path)) return true

  const result = ctx.fs.rmWhere(parentInode, filename)
  if (result.isErr) return fail(result.err, path)
  options.onOk?.(path)
  return true
}

const rmX = async (ctx: Context, path: string, options: RmXOptions) => {
  const found = ctx.fs.findInode(path)
  if (found.isErr) {
    if (options.force && found.err.type === FOp.T.NOT_FOUND) return true
    options.onErr?.(found.err, path)
    return false
  }
  const { parentInode, inode, filename } = found.val
  return _rmX(ctx, options, path, parentInode, filename, inode)
}

export const rm = createCommand('rm', '<FILE...>', 'Remove (unlink) the FILE(s).')
  .help('help')
  .option('dir', '--dir, -d', 'boolean', 'Remove empty directories.')
  .option('force', '--force, -f', 'boolean', 'Ignore nonexistent files and arguments, never prompt.')
  .option('interactive', '--interactive, -i', 'boolean', 'Prompt before each removal.')
  .option('recursive', '--recursive, -r', 'boolean', 'Remove directories and their contents recursively.')
  .option('verbose', '--verbose, -v', 'boolean', 'Explain what is being done.')
  .program(async ({ proc, options }, ...paths) => {
    const { ctx, stdio } = proc

    if (! paths.length) {
      if (options.force) return 0
      throw new UserError('Missing operand')
    }

    const errors: string[] = []

    for (const path of paths) {
      await rmX(ctx, path, {
        ...pick(options, ['dir', 'recursive', 'force']),
        onPromptEnter: options.interactive
          ? path => stdio.prompt(`Enter ${displayFileT(FileT.DIR)} '${path}'?`)
          : undefined,
        onPromptRm: options.interactive
          ? (type, path) => stdio.prompt(`Remove ${displayFileT(type)} '${path}'?`)
          : undefined,
        onErr: (err, path) => {
          errors.push(`Cannot remove '${path}': ${FOp.displayError(err)}`)
        },
        onOk: (path) => {
          if (options.verbose) stdio.writeLn(`Removed '${path}'`)
        },
      })
    }

    if (errors.length) proc.error(errors)
    return errors.length ? 1 : 0
  })
