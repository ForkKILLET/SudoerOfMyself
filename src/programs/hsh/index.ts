import chalk from 'chalk'

import { Process } from '@/sys0/proc'
import { createCommand } from '@/sys0/program'
import { FileT, FOp } from '@/sys0/fs'
import { Path } from '@/sys0/fs/path'
import { CompCandidate, CompProvider, Readline, ReadlineHistory } from '@/sys0/readline'
import { Stdin, Stdio, Stdout } from '@/sys0/stdio'

import { expand, HSH_CHARS, HshAstCommand, HshAstScript, HshTokenText, parse, tokenize } from './parse'
import { PROGRAMS, BUILTINS } from '@/programs'
import { MakeOptional } from '@/utils/types'

export const execute = async (proc: Process, command: HshAstCommand): Promise<number> => {
    const { name, args } = command
    const { ctx, env } = proc

    const getStdio = () => {
        const stdin = new Stdin(ctx.term)
        const stdout = new Stdout(ctx.term)

        const { output: outputDesc } = command
        const input = stdin
        const output = outputDesc
            ? ctx.fs.openU(outputDesc.path, outputDesc.type[0] as 'a' | 'w').handle
            : stdout

        const stdio = new Stdio(input, output)
        stdio.stdin = stdin
        stdio.stdout = stdout
        return stdio
    }

    if (name in BUILTINS) {
        const originalStdio = proc.stdio
        const originalName = proc.name
        proc.stdio = getStdio()
        proc.name = name
        try {
            return await BUILTINS[name](proc, name, ...args)
        }
        catch (err) {
            proc.error(err)
            return 1
        }
        finally {
            proc.stdio = originalStdio
            proc.name = originalName
        }
    }
    else {
        const exeRes = ctx.fs.findInEnvPath(name, env.PATH, { cwd: env.PWD })
        if (FOp.isErr(exeRes)) {
            if (exeRes.type === FOp.T.NOT_ALLOWED_TYPE) proc.error(`${name}: Not an executable`)
            else proc.stdio.writeLn(`${name}: Command not found`)
            return 127
        }
        const { programName } = exeRes.file
        return await proc.spawn(PROGRAMS[programName], { name, stdio: getStdio() }, ...args)
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
    const etokens = expand(tokens, env)

    const getEmptyTokenEntry = (): [ number | null, HshTokenText ] => [
        tokens.length ? null : 0,
        {
			type: 'text',
			content: '',
			begin: -1,
			end: - 1,
        }
    ]

    const [ tokenIndex, token ] = [ ...tokens.entries() ]
        .find(([ , token ]) => (line.cursor - 1).isBetween(token.begin, token.end))
        ?? getEmptyTokenEntry()
    const [ _etokenIndex, etoken ] = [ ...etokens.entries() ]
        .find(([ , etoken ]) => (line.cursor - 1).isBetween(etoken.begin, etoken.end))
        ?? getEmptyTokenEntry()

    const getCandidates = (
        list: MakeOptional<CompCandidate, 'display'>[],
        { cursorToken = token, startIndex = 0, endIndex = token.content.length } = {}
    ) => {
        const { content, begin } = cursorToken
        const tokenBefore = content.slice(startIndex, line.cursor - begin)
        const tokenAfter = content.slice(line.cursor - begin, endIndex)
        return list
            .filter(({ value }) => value.startsWith(tokenBefore) && value.endsWith(tokenAfter) && value !== content)
            .map(({ value, display = value }): CompCandidate => ({
                value: value.slice(tokenBefore.length, value.length - tokenAfter.length),
                display,
            }))
    }

    if (token.type === 'variable' || token.type === 'text' && token.content === '$' && ! token.isSq) {
        return getCandidates([ ...Object.keys(env).sort(), ...HSH_CHARS.senv ].map(name => ({ value: '$' + name })))
    }

    const isExplicitPath = Path.isAbsOrRel(token.content)

    if (tokenIndex === 0 && ! isExplicitPath) {
        return getCandidates([ ...Object.keys(PROGRAMS), ...Object.keys(BUILTINS) ].map(name => ({ value: name })))
    }

    const { dirname, filename } = Path.getDirAndName(etoken.content, true)

    if (filename === '..') return [ { value: '/', display: '../' } ]

    const dirRes = ctx.fs.find(dirname, { allowedTypes: [ FileT.DIR ] })
    if (FOp.isErr(dirRes)) return []

    const { file: dir } = dirRes
    return getCandidates(
        Object
            .keys(dir.entries)
            .sort()
            .map(name => {
                const child = ctx.fs.getChild(dir, name)
                let display = name, value = name
                if (! child) {
                    display = chalk.redBright(display)
                }
                else if (child.type === FileT.DIR) {
                    display = chalk.blueBright(display) + '/'
                    value += '/'
                }
                else if (child.type === FileT.JSEXE) {
                    display = chalk.greenBright(display) + '*'
                }
                return { value, display }
            }),
        { cursorToken: etoken, startIndex: etoken.content.length - filename.length }
    )
}

export const hsh = createCommand('hsh', '[FILE]', 'Human SHell')
    .help('help')
    .program(async ({ proc }, path) => {
        const { ctx, env, stdio } = proc
        proc.cwd = env.HOME

        const executeLine = async (proc: Process, line: string) => {
            const script = await Promise.try(() => {
                const tokens = tokenize(line)
                const etokens = expand(tokens, env)
                const script = parse(etokens)
                return script
            }).catch(err => {
                proc.error(err)
                return null
            })
            if (! script) {
                proc.env['?'] = '130'
                return
            }
            await executeScript(proc, script)
        }

        const isInteractive = ! path

        if (isInteractive) {
            const historyFile = ctx.fs.openU('.hsh_history', 'ra').handle

            const readline = new Readline(proc, stdio, ctx.term)
            const loop = readline.createLoop({
                history: new ReadlineHistory(historyFile.read().split('\n')),
                prompt: () => `${chalk.blueBright(env.PWD)} ${chalk.greenBright('$')} `,
                onComp: getCompProvider(proc),
                onLine: async (line) => {
                    if (line === '\x04') {
                        stdio.writeLn('')
                        loop.stop()
                        return
                    }
                    await executeLine(proc, line)
                    historyFile.appendLn(line)
                },
                onInterrupt: () => true,
                onEnd: () => stdio.writeLn('[Process exited]'),
            })
            await loop.start()
        }

        else {
            const fh = ctx.fs.openU(path, 'r').handle
            const lines = fh.read().split('\n')
            for (const line of lines) {
                await executeLine(proc, line)
            }
        }

        return 0
    })
