import { createCommand, Program } from '@/sys0/program'
import type { BuiltinRegistryProvider } from './resolve_command'

const writeCommandGroup = (writeLn: (line: string) => void, title: string, names: string[]) => {
  writeLn(`${title}:`)
  writeLn(`  ${names.sort().join('  ')}`)
}

export const createHelp = (
  hsh: Program,
  getBuiltins: BuiltinRegistryProvider,
) => createCommand('help', '[PROGRAM]', 'Show help for a PROGRAM or list available commands.')
  .help('help')
  .program(async ({ proc }, name) => {
    if (! name) {
      const writeLn = (line: string) => proc.stdio.writeLn(line)
      writeCommandGroup(writeLn, 'Shell builtins', Object.keys(getBuiltins()))
      writeLn('')
      writeCommandGroup(
        writeLn,
        'Programs',
        proc.ctx.exec.listInPath(proc.env.PATH, proc.cwd),
      )
      writeLn('')
      writeLn('Use "help PROGRAM" for detailed usage.')
      return 0
    }
    return proc.spawn(hsh, { name: 'hsh' }, '-c', `${name} --help`)
  })
