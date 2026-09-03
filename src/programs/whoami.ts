import { createCommand } from '@/sys0/program'

export const whoami = createCommand('whoami', '', 'Print the effective user name.')
  .help('help')
  .program(({ proc }) => {
    const uid = proc.credentials.effectiveUid
    proc.stdio.writeLn(proc.ctx.accounts.getUserById(uid)?.name ?? uid.toString())
    return 0
  })
