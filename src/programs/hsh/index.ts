import chalk from 'chalk'

import { Process } from '@/sys0/proc'
import { Program } from '@/sys0/program'
import { FOpT } from '@/sys0/fs'
import { echo } from '@/programs/echo'
import { cd } from '@/programs/cd'

import { parse } from './parse'

export const builtins: Record<string, Program> = {
	echo,
	cd,
}

export const execute = async (tokens: string[], proc: Process): Promise<number> => {
    // TODO: pipe

    const [ cmd, ...args ] = tokens
	if (cmd in builtins) {
		return await builtins[cmd](proc, cmd, ...args)
	}
    const { ctx, env } = proc
    const exeRes = ctx.fs.findInEnvPath(cmd, env.PATH, { cwd: env.PWD })
    if (exeRes.type !== FOpT.OK) {
        proc.stdio.writeLn(`shell: ${cmd}: Command not found`)
        return 127
    }
    const { file } = exeRes
    return await proc.spawn(file.program, cmd, ...args)
}

export const hsh: Program = async (proc: Process) => {
    const { stdio, env } = proc
    proc.cwd = env.HOME

    const readline = stdio.createReadline(proc)
    const loop = readline.createLoop({
		prompt: () => `${chalk.blueBright(env.PWD)} ${chalk.greenBright('$')} `,
        onLine: async (line) => {
            const { tokens } = parse(line, env)
            const ret = await execute(tokens, proc)
        	env['?'] = ret.toString()
        },
        onInterrupt: () => true
    })
    await loop.start()
    return 0
}   

export default hsh