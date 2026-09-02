import type { Process } from '@/sys0/proc'

export const initializeShellParameters = (
  process: Process,
  arg0: string,
  args: string[],
) => {
  const { variables } = process
  variables.set('$', process.pid.toString(), { exported: false })
  variables.set('?', '0', { exported: false })
  variables.set('!', '', { exported: false })
  variables.set('#', args.length.toString(), { exported: false })
  variables.set('0', arg0, { exported: false })
  variables.set('*', args.join(' '), { exported: false })
  variables.set('@', args.join(' '), { exported: false })
  variables.set('-', '', { exported: false })
  variables.set('_', arg0, { exported: false })

  for (let index = 1; index <= 9; index ++) {
    const value = args[index - 1]
    if (value === undefined) variables.unset(index.toString())
    else variables.set(index.toString(), value, { exported: false })
  }
}

export const updateLastArgument = (
  process: Process,
  command: { name: string, args: string[] },
) => {
  process.variables.set('_', command.args.at(- 1) ?? command.name, { exported: false })
}
