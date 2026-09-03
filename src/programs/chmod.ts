import { createCommand } from '@/sys0/program'
import { parseFileMode } from '@/sys0/fs/file_mode'
import { FileT } from '@/sys0/fs'
import { UserError } from '@/utils/errors'
import { applyToPaths } from './fs_recursive'

export const chmod = createCommand('chmod', '[OPTION]... MODE FILE...', 'Change file mode bits.')
  .help('help')
  .option('recursive', '--recursive, -R', 'boolean', 'Change files and directories recursively')
  .program(({ proc, options }, modeValue, ...paths) => {
    proc.staticName = 'chmod'
    if (! modeValue) throw new UserError('Missing mode operand')
    if (! paths.length) throw new UserError(`Missing operand after '${modeValue}'`)
    if (parseFileMode(modeValue, 0).isErr) throw new UserError(`Invalid mode: '${modeValue}'`)

    const errors = applyToPaths(proc, paths, options.recursive ?? false, (path, inode) => {
      const parsed = parseFileMode(modeValue, inode.metadata.mode, {
        isDirectory: inode.file.type === FileT.DIR,
        umask: proc.umask,
      })
      if (parsed.isErr) throw new Error(`Validated mode became invalid: ${modeValue}`)
      return proc.fs.chmod(path, parsed.val, '/')
    })
    errors.forEach(({ path, message }) => proc.error(`Cannot access '${path}': ${message}`))
    return errors.length ? 1 : 0
  })
