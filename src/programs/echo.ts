import { createCommand } from '@/sys0/program'

export const echo = createCommand('echo', '<text...>', 'Display a line of text')
    .whenUnknownOption('make-arg')
    .help('help')
    .program(({ proc }, ...args) => {
        proc.stdio.writeLn(args.join(' '))
        return 0
    })
