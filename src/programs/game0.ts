import { Process } from '@/sys0/proc'
import { Program } from '@/sys0/program'
import { hsh1 } from './hsh1'

export const createGame0 = (shell: Program): Program => async (proc: Process) => {
  const { stdio } = proc
  stdio.writeLn('Welcome to HumanOS.')
  await proc.spawn(shell, { name: 'hsh' })
  return 0
}

export const game0 = createGame0(hsh1)
