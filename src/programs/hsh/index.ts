import chalk from 'chalk'

import { Process } from '@/sys0/proc'
import { Program } from '@/sys0/program'
import { FOpT } from '@/sys0/fs'
import { Readline } from '@/sys0/readline'
import { Stdin, Stdio, Stdout } from '@/sys0/stdio'

import { HshAstCommand, HshAstScript, parse, tokenize } from './parse'
import { cd } from '../cd'
import { echo } from '../echo'
import { PROGRAMS } from '..'

const builtins: Record<string, Program> = {
    cd,
    echo,
}

export const execute = async (proc: Process, command: HshAstCommand): Promise<number> => {
    const { name, args } = command
    const { ctx, env } = proc

    const getStdio = () => {
        const { output: outputDesc } = command
        const input = new Stdin(proc.ctx.term)
        const output = outputDesc
            ? ctx.fs.openU(outputDesc.path, outputDesc.type[0] as 'a' | 'w').handle
            : new Stdout(proc.ctx.term)
        const stdio = new Stdio(input, output)
        return stdio
    }

    try {
        if (name in builtins) {
            const originalStdio = proc.stdio
            proc.stdio = getStdio()
            try {
                return await builtins[name](proc, name, ...args)
            }
            finally {
                proc.stdio = originalStdio
            }
        }
        else {
            const exeRes = ctx.fs.findInEnvPath(name, env.PATH, { cwd: env.PWD })
            if (exeRes.type !== FOpT.OK) {
                proc.error(`${name}: Command not found`)
                return 127
            }
            const { programName } = exeRes.file
            return await proc.spawn(PROGRAMS[programName], { name, stdio: getStdio() }, ...args)
        }
    }
    catch (err) {
        proc.error(err as string, name)
        return 1
    }
}

export const executeScript = async (proc: Process, script: HshAstScript): Promise<void> => {
    for (const command of script.commands) {
        const ret = await execute(proc, command)
        proc.env['?'] = ret.toString()
    }
}

export const hsh: Program = async (proc: Process) => {
    const { env, stdio } = proc
    proc.cwd = env.HOME

    const readline = new Readline(proc, stdio)
    const loop = readline.createLoop({
		prompt: () => `${chalk.blueBright(env.PWD)} ${chalk.greenBright('$')} `,
        onLine: async (line) => {
            const tokens = tokenize(line, env)
            const script = parse(tokens)
            await executeScript(proc, script)
        },
        onInterrupt: () => true
    })
    await loop.start()
    return 0
}   

export default hsh