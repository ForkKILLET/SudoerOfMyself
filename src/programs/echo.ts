import { createCommand } from '@/sys0/program'

export const echo = createCommand('echo', '<text...>', 'Display a line of text')
  .whenUnknownOption('make-arg')
  .help('help')
  .option('noNewline', '-n', 'boolean', 'Do not output the trailing newline')
  .program(({ proc, options }, ...args) => {
    const output = args.join(' ')
    if (options.noNewline) proc.stdio.write(output)
    else proc.stdio.writeLn(output)
    return 0
  })
