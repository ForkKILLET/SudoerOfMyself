import chalk from 'chalk'

import { Process } from '@/sys0/proc'
import { Program, wrapProgram } from '@/sys0/program'
import { fOpIsErr } from '@/sys0/fs'
import { Readline, ReadlineHistory } from '@/sys0/readline'
import { Stdin, Stdio, Stdout } from '@/sys0/stdio'

import { HshAstCommand, HshAstScript, parse, tokenize } from './parse'
import { cd } from '../cd'
import { echo } from '../echo'
import { hsh_tokenize } from '../hsh_tokenize'
import { PROGRAMS } from '..'

const BUILTINS: Record<string, Program> = {
    cd,
    echo,
    hsh_tokenize
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
        if (name in BUILTINS) {
            const originalStdio = proc.stdio
            proc.stdio = getStdio()
            try {
                return await BUILTINS[name](proc, name, ...args)
            }
            finally {
                proc.stdio = originalStdio
            }
        }
        else {
            const exeRes = ctx.fs.findInEnvPath(name, env.PATH, { cwd: env.PWD })
            if (fOpIsErr(exeRes)) {
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

export const hsh = wrapProgram(async (proc: Process) => {
    const { ctx, env, stdio } = proc
    proc.cwd = env.HOME

    const historyFile = ctx.fs.openU('.hsh_history', 'ra').handle

    const readline = new Readline(proc, stdio, ctx.term)
    const loop = readline.createLoop({
        history: new ReadlineHistory(historyFile.read().split('\n')),
		prompt: () => `${chalk.blueBright(env.PWD)} ${chalk.greenBright('$')} `,
        onCompletion: (line) => {
            // TODO
            return [ ...Object.keys(PROGRAMS), ...Object.keys(BUILTINS) ]
                .sort()
                .filter(name => name.startsWith(line.before))
                .map(name => ({
                    value: name.slice(line.before.length),
                    display: name
                }))
        },
        onLine: async (line) => {
            const script = await Promise.try(() => {
                const tokens = tokenize(line, env)
                const script = parse(tokens)
                return script
            }).catch(err => {
                proc.error(err as string)
                return null
            })
            if (! script) {
                proc.env['?'] = '130'
                return
            }
            await executeScript(proc, script)
            historyFile.appendLn(line)
        },
        onInterrupt: () => true
    })
    await loop.start()
    return 0
})
