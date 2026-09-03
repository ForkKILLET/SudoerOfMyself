import { Process } from '@/sys0/proc'
import { Program } from '@/sys0/program'
import { hsh1 } from './hsh1'
import { HUMAN_USER_ID } from '@/sys0/identity'

export const createGame0 = (shell: Program): Program => async (proc: Process) => {
  const { stdio } = proc
  const user = proc.ctx.accounts.getUserById(HUMAN_USER_ID)
  if (! user) throw new Error(`Interactive user ${HUMAN_USER_ID} is not configured`)
  stdio.writeLn('Welcome to HumanOS.')
  await proc.spawn(shell, {
    name: 'hsh',
    cwd: user.home,
    credentials: proc.ctx.accounts.createCredentials(user.uid),
    env: {
      HOME: user.home,
      PATH: '/bin',
      PWD: user.home,
      USER: user.name,
      LOGNAME: user.name,
    },
  })
  return 0
}

export const game0 = createGame0(hsh1)
