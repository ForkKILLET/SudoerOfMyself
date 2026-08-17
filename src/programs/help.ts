import { createCommand, Program } from '@/sys0/program'

export const createHelp = (hsh: Program) => createCommand('help', '[PROGRAM]', 'Show help for a PROGRAM')
  .help('help')
  .program(async ({ proc }, name) => {
    name ||= 'help'
    return proc.spawn(hsh, { name: 'hsh' }, '-c', `${name} --help`)
  })
