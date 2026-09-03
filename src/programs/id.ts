import { createCommand } from '@/sys0/program'
import { UserError } from '@/utils/errors'

export const id = createCommand('id', '[OPTION]... [USER]', 'Print user and group information.')
  .help('help')
  .option('user', '--user, -u', 'boolean', 'Print only the effective user ID')
  .option('group', '--group, -g', 'boolean', 'Print only the effective group ID')
  .option('groups', '--groups, -G', 'boolean', 'Print all group IDs')
  .option('name', '--name, -n', 'boolean', 'Print names instead of numeric IDs')
  .program(({ proc, options }, userName, ...rest) => {
    proc.staticName = 'id'
    if (rest.length) throw new UserError('Extra operand')
    const account = userName
      ? proc.ctx.accounts.getUserByName(userName)
      : proc.ctx.accounts.getUserById(proc.credentials.effectiveUid)
    if (! account) throw new UserError(userName ? `${userName}: no such user` : 'Current user is unknown')
    const groupIds = [...proc.ctx.accounts.getGroupsForUser(account.uid)]
    const displayUser = () => options.name ? account.name : account.uid.toString()
    const displayGroup = (gid: number) => options.name
      ? proc.ctx.accounts.getGroupById(gid)?.name ?? gid.toString()
      : gid.toString()
    const groupName = (gid: number) => proc.ctx.accounts.getGroupById(gid)?.name ?? gid.toString()

    const selectors = [options.user, options.group, options.groups].filter(Boolean).length
    if (selectors > 1) throw new UserError('Options -u, -g, and -G are mutually exclusive')
    if (options.user) proc.stdio.writeLn(displayUser())
    else if (options.group) proc.stdio.writeLn(displayGroup(account.primaryGid))
    else if (options.groups) proc.stdio.writeLn(groupIds.map(displayGroup).join(' '))
    else {
      if (options.name) throw new UserError('Option -n requires -u, -g, or -G')
      const primaryGroup = proc.ctx.accounts.getGroupById(account.primaryGid)
      const groups = groupIds.map(gid => `${gid}(${groupName(gid)})`).join(',')
      proc.stdio.writeLn(
        `uid=${account.uid}(${account.name}) `
        + `gid=${account.primaryGid}(${primaryGroup?.name ?? account.primaryGid}) `
        + `groups=${groups}`,
      )
    }
    return 0
  })
