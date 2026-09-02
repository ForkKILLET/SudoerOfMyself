import type { Process } from '@/sys0/proc'

export const getPositionalParameters = (process: Process) => {
  const count = Number.parseInt(process.env['#'] ?? '0', 10)
  if (! Number.isSafeInteger(count) || count <= 0) return []
  return Array.from(
    { length: count },
    (_, index) => process.env[String(index + 1)] ?? '',
  )
}

export const setPositionalParameters = (process: Process, args: string[]) => {
  Object.keys(process.env)
    .filter(name => /^\d+$/.test(name) && name !== '0')
    .forEach(name => process.variables.unset(name))

  process.variables.set('#', args.length.toString(), { exported: false })
  process.variables.set('*', args.join(' '), { exported: false })
  process.variables.set('@', args.join(' '), { exported: false })
  args.forEach((value, index) => {
    process.variables.set(String(index + 1), value, { exported: false })
  })
}

export const initializeShellParameters = (
  process: Process,
  arg0: string,
  args: string[],
) => {
  const { variables } = process
  variables.set('$', process.pid.toString(), { exported: false })
  variables.set('?', '0', { exported: false })
  variables.set('!', '', { exported: false })
  variables.set('0', arg0, { exported: false })
  variables.set('-', '', { exported: false })
  variables.set('_', arg0, { exported: false })
  setPositionalParameters(process, args)
}

export const updateLastArgument = (
  process: Process,
  command: { name: string, args: string[] },
) => {
  process.variables.set('_', command.args.at(- 1) ?? command.name, { exported: false })
}
