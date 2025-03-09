import chalk from 'chalk'

import { Process } from '@/sys0/proc'
import { wrapProgram } from '@/sys0/program'
import { FileT, fOpIsErr, FOpT } from '@/sys0/fs'
import { Path } from '@/sys0/fs/path'
import { CompCandidate, CompProvider, Readline, ReadlineHistory } from '@/sys0/readline'
import { Stdin, Stdio, Stdout } from '@/sys0/stdio'

import { expand, HSH_CHARS, HshAstCommand, HshAstScript, HshTokenText, parse, tokenize } from './parse'
import { PROGRAMS, BUILTINS } from '@/programs'

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
                if (exeRes.type === FOpT.NOT_ALLOWED_TYPE) proc.error(`${name}: Not an executable`)
                else proc.stdio.writeLn(`${name}: Command not found`)
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

export const getCompProvider = (proc: Process): CompProvider => (line) => {
    const { ctx, env } = proc

    const tokens = tokenize(line.content, false)

    const [ tokenIndex, token ] = [ ...tokens.entries() ]
        .find(([ , token ]) => (line.cursor - 1).isBetween(token.begin, token.end))
        ?? [ tokens.length ? null : 0, {
			type: 'text',
			content: '',
			begin: -1,
			end: - 1,
			isDq: false,
			isSq: false,
        } ]

    const getCandidates = (
        list: string[],
        { startIndex = 0, endIndex = token.content.length } = {}
    ) => {
        const tokenBefore = token.content.slice(startIndex, line.cursor - token!.begin)
        const tokenAfter = token.content.slice(line.cursor - token!.begin, endIndex)
        return list
            .filter(str => str.startsWith(tokenBefore) && str.endsWith(tokenAfter) && str !== token.content)
            .map((str): CompCandidate => ({
                value: str.slice(tokenBefore.length, str.length - tokenAfter.length),
                display: str
            }))
    }

    if (token.type === 'variable' || token.type === 'text' && token.content === '$' && ! token.isSq) {
        return getCandidates([ ...Object.keys(env).sort(), ...HSH_CHARS.senv ].map(name => '$' + name))
    }

    const isExplicitPath = Path.isAbsOrRel(token.content)

    if (tokenIndex === 0 && ! isExplicitPath) {
        return getCandidates([ ...Object.keys(PROGRAMS), ...Object.keys(BUILTINS) ])
    }

    if (! token) return []

    const { dirname, filename } = Path.getDirAndName(token.content, true)

    if (filename === '..') return [ { value: '/', display: '../' } ]

    const dirRes = ctx.fs.find(dirname, { allowedTypes: [ FileT.DIR ] })
    if (fOpIsErr(dirRes)) return []

    const { entries } = dirRes.file
    return getCandidates(
        Object
            .keys(entries)
            .map(name => {
                const child = ctx.fs.getFileByIid(entries[name])
                return name + (child?.type === FileT.DIR ? '/' : '')
            })
            .sort(),
        { startIndex: token.content.length - filename.length }
    )
}

export const hsh = wrapProgram(async (proc: Process) => {
    const { ctx, env, stdio } = proc
    proc.cwd = env.HOME

    const historyFile = ctx.fs.openU('.hsh_history', 'ra').handle

    const readline = new Readline(proc, stdio, ctx.term)
    const loop = readline.createLoop({
        history: new ReadlineHistory(historyFile.read().split('\n')),
		prompt: () => `${chalk.blueBright(env.PWD)} ${chalk.greenBright('$')} `,
        onCompletion: getCompProvider(proc),
        onLine: async (line) => {
            const script = await Promise.try(() => {
                const tokens = tokenize(line)
                const expanded = expand(tokens, env)
                const script = parse(expanded)
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
