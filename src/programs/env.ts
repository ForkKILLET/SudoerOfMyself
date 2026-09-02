import { wrapProgram } from '@/sys0/program'
import { UserError } from '@/utils/errors'
import { execute } from './hsh'
import { parseEnvAssignment } from './hsh/parse'
import { BuiltinRegistryProvider } from './resolve_command'

export const createEnvCommand = (getBuiltins: BuiltinRegistryProvider) => (
  wrapProgram(async (proc, _self, ...args) => {
    let clearEnvironment = false
    let cursor = 0
    while (cursor < args.length) {
      const arg = args[cursor]
      if (arg === '--') {
        cursor ++
        break
      }
      if (arg === '-' || arg === '-i' || arg === '--ignore-environment') {
        clearEnvironment = true
        cursor ++
        continue
      }
      if (arg.startsWith('-')) throw new UserError(`Unknown option: ${arg}`)
      break
    }

    const environment = clearEnvironment ? {} : proc.variables.environment()
    while (cursor < args.length) {
      const assignment = parseEnvAssignment(args[cursor])
      if (! assignment) break
      environment[assignment.name] = assignment.value
      cursor ++
    }

    const name = args[cursor]
    if (name === undefined) {
      Object.entries(environment)
        .sort(([left], [right]) => left.localeCompare(right))
        .forEach(([key, value]) => proc.stdio.writeLn(`${key}=${value}`))
      return 0
    }

    return proc.spawn(
      child => execute(child, { name, args: args.slice(cursor + 1) }, getBuiltins()),
      {
        name: 'env',
        env: environment,
        clearEnvironment: true,
      },
    )
  })
)
