import { wrapProgram } from '@/sys0/program'
import { UserError } from '@/utils/errors'

export const cd = wrapProgram(async (proc, self, ...args) => {
  const { env } = proc
  if (args.length === 0) return cd(proc, self, env.HOME)
  if (args.length > 1) throw new UserError('Too many arguments')
  const [path] = args
  proc.cwd = proc.fs.findDirectoryForAccessU(path).path
  return 0
})
