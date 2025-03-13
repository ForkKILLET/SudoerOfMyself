import { createCommand } from '@/sys0/program'
import { hsh } from './hsh'

export const help = createCommand('help', '[PROGRAM]', 'Show help for a PROGRAM')
    .help('help')
    .program(async ({ proc }, name) => {
        console.log()
        name ||= 'help'
        return proc.spawn(hsh, { name: 'hsh' }, '-c', `${name} --help`)
    })