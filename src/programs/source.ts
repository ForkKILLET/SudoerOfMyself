import { FOp } from '@/sys0/fs'
import { Path } from '@/sys0/fs/path'
import { createCommand } from '@/sys0/program'
import { UserError } from '@/utils/errors'
import { executeControlScript } from './hsh'
import { enterReturnContext, getReturnRequest, leaveReturnContext } from './hsh/control'
import { getPositionalParameters, setPositionalParameters } from './hsh/parameters'
import { parseControlScript } from './hsh/script'
import type { BuiltinRegistryProvider } from './resolve_command'

const sourceCandidates = (path: string, searchPath: string, cwd: string) => {
  if (Path.hasSlash(path)) return [Path.resolve(path, cwd)]
  const candidates = searchPath
    .split(':')
    .filter(Boolean)
    .map(directory => Path.resolve(`${directory}/${path}`, cwd))
  candidates.push(Path.resolve(path, cwd))
  return [...new Set(candidates)]
}

export const createSourceBuiltin = (getBuiltins: BuiltinRegistryProvider) => (
  createCommand('source', 'FILE [ARG...]', 'Execute commands from a file in the current shell.')
    .help('help')
    .whenUnknownOption('make-arg')
    .program(async ({ proc }, path, ...args) => {
      if (! path) throw new UserError('Missing file operand')

      let source: string | undefined
      let sourcePath = path
      for (const candidate of sourceCandidates(path, proc.env.PATH, proc.cwd)) {
        const opened = proc.fs.open(candidate, 'r', '/')
        if (opened.isOk) {
          source = opened.val.handle.read()
          sourcePath = candidate
          break
        }
        if (opened.err.type === FOp.T.NOT_FOUND) continue
        throw new UserError(`${candidate}: ${FOp.displayError(opened.err)}`)
      }
      if (source === undefined) throw new UserError(`${path}: file not found`)

      const previousParameters = args.length ? getPositionalParameters(proc) : undefined
      if (previousParameters) setPositionalParameters(proc, args)
      const frame = enterReturnContext(proc)
      try {
        const script = parseControlScript(source)
        const status = await executeControlScript(proc, script, getBuiltins())
        return getReturnRequest(proc) ?? status
      }
      catch (error) {
        if (error instanceof UserError) {
          throw new UserError(`${sourcePath}: ${error.message}`)
        }
        throw error
      }
      finally {
        leaveReturnContext(proc, frame)
        if (previousParameters) setPositionalParameters(proc, previousParameters)
      }
    })
)
