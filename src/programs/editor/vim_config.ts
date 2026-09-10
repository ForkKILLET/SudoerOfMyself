import { FOp } from '@/sys0/fs'
import { Path } from '@/sys0/fs/path'
import type { Process } from '@/sys0/proc'
import { errorMessage } from '@/utils/errors'
import { setVimOptions, VIM_DEFAULT_OPTIONS } from './vim_options'

const MAX_CONFIG_SIZE = 64 * 1024

export const readVimConfig = (proc: Process) => {
  const options = { ...VIM_DEFAULT_OPTIONS }
  const diagnostics: string[] = []
  const home = proc.env.HOME || proc.ctx.accounts?.getUserById(proc.credentials.realUid)?.home
  if (! home) return { options, diagnostics }
  const filename = Path.resolve('.vimrc', Path.resolve(home, proc.cwd))
  const opened = proc.fs.open(filename, 'r', '/')
  if (opened.isErr) {
    if (opened.err.type !== FOp.T.NOT_FOUND) diagnostics.push(`${filename}: ${FOp.displayError(opened.err)}`)
    return { options, diagnostics }
  }
  const content = opened.val.handle.read()
  if (content.length > MAX_CONFIG_SIZE) {
    diagnostics.push(`${filename}: Configuration exceeds ${MAX_CONFIG_SIZE} characters`)
    return { options, diagnostics }
  }
  for (const [index, line] of content.split(/\r\n?|\n/u).entries()) {
    const command = line.trim().replace(/^:\s*/u, '').replace(/(?:^|\s)".*$/u, '').trim()
    if (! command) continue
    try {
      if (! /^set(?:\s|$)/u.test(command)) throw new Error('Only set commands are supported in .vimrc')
      setVimOptions(options, command.slice(3))
    }
    catch (error) {
      diagnostics.push(`${filename}:${index + 1}: ${errorMessage(error)}`)
    }
  }
  return { options, diagnostics }
}
