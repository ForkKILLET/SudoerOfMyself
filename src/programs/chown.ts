import { createCommand } from '@/sys0/program'
import type { GroupId, UserId } from '@/sys0/identity'
import { UserError } from '@/utils/errors'
import type { Process } from '@/sys0/proc'
import { applyToPaths } from './fs_recursive'

const numericId = (value: string) => {
  if (! /^\d+$/u.test(value)) return undefined
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : undefined
}

export const resolveUserId = (proc: Process, value: string): UserId => {
  const account = proc.ctx.accounts.getUserByName(value)
  const uid = account?.uid ?? numericId(value)
  if (uid === undefined) throw new UserError(`Invalid user: '${value}'`)
  return uid
}

export const resolveGroupId = (proc: Process, value: string): GroupId => {
  const account = proc.ctx.accounts.getGroupByName(value)
  const gid = account?.gid ?? numericId(value)
  if (gid === undefined) throw new UserError(`Invalid group: '${value}'`)
  return gid
}

export const chown = createCommand('chown', '[OPTION]... OWNER[:GROUP] FILE...', 'Change file owner and group.')
  .help('help')
  .option('recursive', '--recursive, -R', 'boolean', 'Operate on files and directories recursively')
  .program(({ proc, options }, ownerSpec, ...paths) => {
    proc.staticName = 'chown'
    if (! ownerSpec) throw new UserError('Missing owner operand')
    if (! paths.length) throw new UserError(`Missing operand after '${ownerSpec}'`)
    const separator = ownerSpec.indexOf(':')
    const ownerValue = separator === - 1 ? ownerSpec : ownerSpec.slice(0, separator)
    const groupValue = separator === - 1 ? undefined : ownerSpec.slice(separator + 1)
    if (! ownerValue && ! groupValue) throw new UserError(`Invalid owner: '${ownerSpec}'`)
    const uid = ownerValue ? resolveUserId(proc, ownerValue) : undefined
    const gid = groupValue ? resolveGroupId(proc, groupValue) : undefined

    const errors = applyToPaths(
      proc,
      paths,
      options.recursive ?? false,
      path => proc.fs.chown(path, uid, gid, '/'),
    )
    errors.forEach(({ path, message }) => proc.error(`Cannot change ownership of '${path}': ${message}`))
    return errors.length ? 1 : 0
  })
