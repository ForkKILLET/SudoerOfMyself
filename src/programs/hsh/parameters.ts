import type { Process } from '@/sys0/proc'

export const initializeShellParameters = (
  process: Process,
  arg0: string,
  args: string[],
) => {
  const { env } = process
  env['$'] = process.pid.toString()
  env['?'] = '0'
  env['!'] = ''
  env['#'] = args.length.toString()
  env['0'] = arg0
  env['*'] = args.join(' ')
  env['@'] = args.join(' ')
  env['-'] = ''
  env['_'] = arg0

  for (let index = 1; index <= 9; index ++) {
    const value = args[index - 1]
    if (value === undefined) delete env[index.toString()]
    else env[index.toString()] = value
  }
}

export const updateLastArgument = (
  process: Process,
  command: { name: string, args: string[] },
) => {
  process.env['_'] = command.args.at(- 1) ?? command.name
}
