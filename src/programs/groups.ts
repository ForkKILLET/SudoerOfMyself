import { createCommand } from '@/sys0/program'
import { UserError } from '@/utils/errors'

export const groups = createCommand('groups', '[USER...]', 'Print group memberships.')
  .help('help')
  .program(({ proc }, ...names) => {
    const explicitUsers = names.length > 0
    if (! names.length) {
      const current = proc.ctx.accounts.getUserById(proc.credentials.effectiveUid)
      if (! current) throw new UserError(`Unknown user ID: ${proc.credentials.effectiveUid}`)
      names.push(current.name)
    }

    let failed = false
    names.forEach((name) => {
      const user = proc.ctx.accounts.getUserByName(name)
      if (! user) {
        proc.error(`${name}: no such user`)
        failed = true
        return
      }
      const groupNames = [...proc.ctx.accounts.getGroupsForUser(user.uid)]
        .map(gid => proc.ctx.accounts.getGroupById(gid)?.name ?? gid.toString())
      proc.stdio.writeLn(`${explicitUsers ? `${name} : ` : ''}${groupNames.join(' ')}`)
    })
    return failed ? 1 : 0
  })
