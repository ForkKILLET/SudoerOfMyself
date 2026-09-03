import { createCommand } from '@/sys0/program'
import { UserError } from '@/utils/errors'
import { applyToPaths } from './fs_recursive'
import { resolveGroupId } from './chown'

export const chgrp = createCommand('chgrp', '[OPTION]... GROUP FILE...', 'Change file group ownership.')
  .help('help')
  .option('recursive', '--recursive, -R', 'boolean', 'Operate on files and directories recursively')
  .program(({ proc, options }, groupValue, ...paths) => {
    proc.staticName = 'chgrp'
    if (! groupValue) throw new UserError('Missing group operand')
    if (! paths.length) throw new UserError(`Missing operand after '${groupValue}'`)
    const gid = resolveGroupId(proc, groupValue)

    const errors = applyToPaths(
      proc,
      paths,
      options.recursive ?? false,
      path => proc.fs.chgrp(path, gid, '/'),
    )
    errors.forEach(({ path, message }) => proc.error(`Cannot change group of '${path}': ${message}`))
    return errors.length ? 1 : 0
  })
