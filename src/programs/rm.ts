import { Context } from '@/sys0/context'
import { DirFile, displayFileT, File, FileT, FOp, Inode } from '@/sys0/fs'
import { Path } from '@/sys0/fs/path'
import { createCommand } from '@/sys0/program'
import { pick } from '@/utils'
import { Awaitable } from '@/utils/types'

export interface RmXOptions {
    dir?: boolean
    recursive?: boolean
    force?: boolean
    onErr?: (err: FOp.Err, path: string) => void
    onOk?: (path: string) => void
    onPromptRm?: (type: FileT, path: string) => Awaitable<boolean>
    onPromptEnter?: (path: string) => Awaitable<boolean>
}

const _rmX = async (
    ctx: Context, options: RmXOptions,
    path: string, parentInode: Inode<DirFile>, filename: string, inode: Inode<File>
) => {
    const fail = (err: FOp.Err, path: string) => {
        if (! (options.force && err.type === FOp.T.NOT_FOUND)) options.onErr?.(err, path)
    }

    $isDir: if (ctx.fs.isInodeOfType(inode, [ FileT.DIR ])) {
        const { file } = inode
        const childnames = Object.keys(file.entries)
        if (! childnames.length && options.dir) break $isDir
        if (! options.recursive)
            return fail(FOp.err({ type: FOp.T.IS_A_DIR }), path)

        if (options.onPromptEnter && ! await options.onPromptEnter(path)) break $isDir

        let childFailed = false
        for (const childname of childnames) {
            const childpath = Path.join(path, childname)
            const childInode = ctx.fs.getChildInode(file, childname)
            if (! childInode) {
                childFailed = true
                fail(FOp.err({ type: FOp.T.NOT_FOUND }), childpath)
                continue
            }
            await _rmX(ctx, options, childpath, inode, childname, childInode)
        }

        if (childFailed) return fail(FOp.err({ type: FOp.T.IS_A_DIR }), path)
    }

    if (options.onPromptRm && ! await options.onPromptRm(inode.file.type, path)) return

    ctx.fs.rmWhere(parentInode, filename)
    options.onOk?.(path)
}

const rmX = async (ctx: Context, path: string, options: RmXOptions) => {
    const { parentInode, inode, filename } = ctx.fs.findInodeU(path)
    if (! parentInode) return
    await _rmX(ctx, options, path, parentInode, filename, inode)
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

        options.interactive ??= ! options.force
        
        for (const path of paths) {
            await rmX(ctx, path, {
                ...pick(options, [ 'dir', 'recursive', 'force' ]),
                onPromptEnter: options.interactive
                    ? (path) => stdio.prompt(`Enter ${displayFileT(FileT.DIR)} '${path}'?`)
                    : undefined,
                onPromptRm: options.interactive
                    ? (type, path) => stdio.prompt(`Remove ${displayFileT(type)} '${path}'?`)
                    : undefined,
                onErr: (err, path) => {
                    ctx.fs.unwrap(err, `Cannot remove '${path}'`)
                },
                onOk: (path) => {
                    if (options.verbose) stdio.writeLn(`Removed '${path}'`)
                }
            })
        }

        return 0
    })