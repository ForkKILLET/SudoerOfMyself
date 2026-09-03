import { createCommand } from '@/sys0/program'
import { GridDisplay } from '@/sys0/display'
import { DirFile, FileT, type Inode } from '@/sys0/fs'
import { partition, prop } from '@/utils'
import { chalk } from '@/utils/color'
import { errorMessage } from '@/utils/errors'
import { formatFileMode } from '@/sys0/fs/file_mode'

interface ListedEntry {
  inode: Inode
  path: string
}

export const ls = createCommand('ls', '<path...>', 'List directory contents')
  .help('help')
  .option('all', '--all, -a', 'boolean', 'Show hidden files')
  .option('color', '--color, -c', 'boolean', 'Colorize the output')
  .option('long', '--long, -l', 'boolean', 'Use a long listing format')
  .program(({ proc, options }, ...paths) => {
    const { stdio, ctx } = proc
    proc.staticName = 'ls'

    options.color ??= true

    const entries: ListedEntry[] = []
    const errs: string[] = []

    if (! paths.length) paths.push('')
    paths.forEach((path) => {
      try {
        const { inode } = proc.fs.findInodeU(path)
        entries.push({ inode, path })
      }
      catch (err) {
        errs.push(errorMessage(err))
      }
    })

    proc.error(errs)

    const [dirEntries, otherEntries] = partition(
      entries,
      (entry): entry is ListedEntry & { inode: Inode<DirFile> } => entry.inode.file.type === FileT.DIR,
    )

    const displayName = (name: string, inode: Inode | undefined) => {
      if (! inode) return chalk.redBright(name)
      if (inode.file.type === FileT.DIR) return chalk.blueBright(name) + '/'
      if ((inode.metadata.mode & 0o111) !== 0) return chalk.greenBright(name) + '*'
      return name
    }
    const longEntry = (name: string, inode: Inode) => {
      const owner = ctx.accounts.getUserById(inode.metadata.uid)?.name ?? inode.metadata.uid.toString()
      const group = ctx.accounts.getGroupById(inode.metadata.gid)?.name ?? inode.metadata.gid.toString()
      const size = inode.file.type === FileT.NORMAL
        ? new TextEncoder().encode(inode.file.content).byteLength
        : 0
      const renderedName = options.color ? displayName(name, inode) : name
      return `${formatFileMode(inode.metadata.mode, inode.file.type)}  `
        + `${owner.padEnd(8)} ${group.padEnd(8)} ${size.toString().padStart(8)} ${renderedName}`
    }

    const outputs: string[] = []
    if (otherEntries.length) outputs.push(options.long
      ? otherEntries.map(({ path, inode }) => longEntry(path, inode)).join('\n')
      : new GridDisplay(ctx.term, otherEntries.map(prop('path'))).toString())

    outputs.push(...dirEntries.map(({ inode, path }) => {
      const children = proc.fs.getChildren(inode.file)
        .map(({ name }) => name)
        .filter(name => options.all || ! name.startsWith('.'))
      const listing = options.long
        ? children.map((name) => {
            const child = proc.fs.getChildInode(inode.file, name)
            return child ? longEntry(name, child) : chalk.redBright(name)
          }).join('\n')
        : new GridDisplay(ctx.term, children.map((name) => {
            if (! options.color) return name
            return displayName(name, proc.fs.getChildInode(inode.file, name) ?? undefined)
          })).toString()
      return (paths.length > 1 ? `${path}:\n` : '') + listing
    }))

    stdio.write(outputs.join('\n'))

    return errs.length ? 1 : 0
  })
