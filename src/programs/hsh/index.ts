import { chalk } from '@/utils/color'

import { Process } from '@/sys0/proc'
import { createCommand, Program } from '@/sys0/program'
import { FileT, FOp, FRead, FWrite } from '@/sys0/fs'
import { Path } from '@/sys0/fs/path'
import { CompCandidate, CompProvider, Readline, ReadlineHistory } from '@/sys0/readline'
import { Stdio } from '@/sys0/stdio'

import { expand, HSH_CHARS, HshAstCommand, HshAstScript, HshTokenText, parse, tokenize } from './parse'
import { MakeOptional } from '@/utils/types'
import { isBetween } from '@/utils'
import { Result } from 'fk-result'
import { ExecErrorT } from '@/sys0/exec'
import { normalExit, normalizeExit, ProcessExit } from '@/sys0/process_exit'
import { createPipe } from '@/sys0/pipe'
import { JobTable, ProcessGroup } from '@/sys0/job'
import { getShellExitRequest } from './control'

export type ProgramRegistry = Readonly<Record<string, Program>>

export interface HshConfig {
  builtins: ProgramRegistry
}

export interface ExecuteOptions {
  input?: FRead
  output?: FWrite
  pipelineStage?: boolean
  processGroup?: ProcessGroup
  foreground?: boolean
}

export const execute = async (
  proc: Process,
  command: HshAstCommand,
  builtins: ProgramRegistry,
  options: ExecuteOptions = {},
): Promise<ProcessExit> => {
  const { name, args } = command
  const { ctx, env } = proc

  const getStdio = () => {
    const { input: inputDesc } = command
    const { output: outputDesc } = command
    const { error: errorDesc } = command
    const input = inputDesc
      ? ctx.fs.openU(inputDesc.path, 'r').handle
      : options.input ?? proc.stdio.input
    const output = outputDesc
      ? ctx.fs.openU(outputDesc.path, outputDesc.type[0] as 'a' | 'w').handle
      : options.output ?? proc.stdio.output
    const error = errorDesc
      ? ctx.fs.openU(errorDesc.path, errorDesc.type[0] as 'a' | 'w').handle
      : proc.stdio.error

    const stdio = new Stdio(input, output, error)
    stdio.stdin = inputDesc || options.input ? undefined : proc.stdio.stdin
    stdio.stdout = outputDesc || options.output ? undefined : proc.stdio.stdout
    stdio.stderr = errorDesc ? undefined : proc.stdio.stderr
    return stdio
  }

  if (name in builtins) {
    if (options.pipelineStage) {
      return proc.spawn(builtins[name], {
        name,
        stdio: getStdio(),
        processGroup: options.processGroup,
        foreground: options.foreground,
      }, ...args)
    }

    const originalStdio = proc.stdio
    const originalName = proc.name
    proc.stdio = getStdio()
    proc.name = name
    try {
      return normalizeExit(await builtins[name](proc, name, ...args))
    }
    catch (err) {
      proc.error(err)
      return normalExit(1)
    }
    finally {
      proc.stdio = originalStdio
      proc.name = originalName
    }
  }
  else {
    const exeRes = ctx.exec.resolve(name, { envPath: env.PATH, cwd: env.PWD })
    if (exeRes.isErr) {
      switch (exeRes.err.type) {
        case ExecErrorT.NOT_FOUND:
          proc.stdio.writeErrorLn(`${name}: Command not found`)
          return normalExit(127)
        case ExecErrorT.NOT_EXECUTABLE:
          proc.error(`${name}: Not an executable`)
          return normalExit(126)
        case ExecErrorT.NATIVE_PROGRAM_NOT_REGISTERED:
          proc.error(`${name}: Native program '${exeRes.err.programId}' is not registered`)
          return normalExit(126)
        case ExecErrorT.FILE_SYSTEM_ERROR:
          proc.error(`${name}: ${FOp.displayError(exeRes.err.error)}`)
          return normalExit(126)
      }
    }
    return proc.spawn(exeRes.val.program, {
      name,
      stdio: getStdio(),
      processGroup: options.processGroup,
      foreground: options.foreground,
    }, ...args)
  }
}

export interface ExecutePipelineOptions {
  input?: FRead
  processGroup?: ProcessGroup
  foreground?: boolean
  forceChild?: boolean
}

export const executePipeline = async (
  proc: Process,
  commands: HshAstCommand[],
  builtins: ProgramRegistry,
  options: ExecutePipelineOptions = {},
): Promise<ProcessExit[]> => {
  if (commands.length === 1) {
    return [await execute(proc, commands[0], builtins, {
      input: options.input,
      pipelineStage: options.forceChild,
      processGroup: options.processGroup,
      foreground: options.foreground,
    })]
  }

  const pipes = commands.slice(1).map(() => createPipe())
  const runs = commands.map((command, index) => {
    const output = pipes[index]?.writer
    return execute(proc, command, builtins, {
      input: pipes[index - 1]?.reader ?? options.input,
      output,
      pipelineStage: true,
      processGroup: options.processGroup,
      foreground: options.foreground,
    }).finally(() => output?.close())
  })
  return Promise.all(runs)
}

export const executeScript = async (
  proc: Process,
  script: HshAstScript,
  builtins: ProgramRegistry,
  { source }: { source?: string } = {},
): Promise<void> => {
  let commandIndex = 0
  while (commandIndex < script.commands.length) {
    const pipeline: HshAstCommand[] = []
    do {
      const command = script.commands[commandIndex ++]
      pipeline.push(command)
      if (! command.pipeToNext) break
    } while (commandIndex < script.commands.length)

    const processGroup = new ProcessGroup()
    if (script.background) {
      const eofInput = createPipe()
      eofInput.writer.close()
      const completion = executePipeline(proc, pipeline, builtins, {
        input: eofInput.reader,
        processGroup,
        foreground: false,
        forceChild: true,
      })
        .then(statuses => statuses.at(- 1) ?? normalExit(0))
        .catch((error) => {
          proc.error(error)
          return normalExit(1)
        })
      proc.jobTable ??= new JobTable()
      const command = source?.trim() || pipeline
        .map(({ name, args }) => [name, ...args].join(' '))
        .join(' | ') + ' &'
      const job = proc.jobTable.create(processGroup, command, completion)
      proc.env['!'] = processGroup.pgid?.toString() ?? ''
      proc.env['?'] = '0'
      proc.stdio.writeLn(`[${job.id}] ${processGroup.pgid ?? '-'}`)
      return
    }

    const exitStatuses = await executePipeline(proc, pipeline, builtins, {
      processGroup,
      foreground: true,
    })
    if (exitStatuses.some(status => status.reason === 'signal' && status.signal === 'SIGINT')) {
      proc.stdio.writeLn('')
    }
    proc.env['?'] = exitStatuses.at(- 1)?.code.toString() ?? '0'
    if (getShellExitRequest(proc)) return
  }
}

export const getCompProvider = (
  proc: Process,
  builtins: ProgramRegistry,
): CompProvider => (line) => {
  const { ctx, env } = proc

  const tokens = tokenize(line.content, false)
  const etokens = expand(tokens, env)

  const getEmptyTokenEntry = (): [ number | null, HshTokenText ] => [
    tokens.length ? null : 0,
    {
      type: 'text',
      content: '',
      begin: - 1,
      end: - 1,
    },
  ]

  const [tokenIndex, token] = [...tokens.entries()]
    .find(([, token]) => isBetween(line.cursor - 1, token.begin, token.end))
    ?? getEmptyTokenEntry()
  const [, etoken] = [...etokens.entries()]
    .find(([, etoken]) => isBetween(line.cursor - 1, etoken.begin, etoken.end))
    ?? getEmptyTokenEntry()

  const getCandidates = (
    list: MakeOptional<CompCandidate, 'display'>[],
    { cursorToken = token, startIndex = 0, endIndex = token.content.length } = {},
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

  if (token.type === 'variable' || (token.type === 'text' && token.content === '$' && ! token.isSq)) {
    return getCandidates([...Object.keys(env).sort(), ...HSH_CHARS.senv].map(name => ({ value: '$' + name })))
  }

  const isExplicitPath = Path.isAbsOrRel(token.content)

  const isCommandToken = tokenIndex === 0 || (
    tokenIndex !== null && tokens[tokenIndex - 1]?.type === 'pipe'
  )
  if (isCommandToken && ! isExplicitPath) {
    const installedPrograms = ctx.exec.listInPath(env.PATH, env.PWD)
    return getCandidates([...installedPrograms, ...Object.keys(builtins)].map(name => ({ value: name })))
  }

  const { dirname, filename } = Path.getDirAndName(etoken.content, true)

  if (filename === '..') return [{ value: '/', display: '../' }]

  const dirRes = ctx.fs.find(dirname, { allowedTypes: [FileT.DIR] })
  if (dirRes.isErr) return []

  const { file: dir } = dirRes.val
  return getCandidates(
    ctx.fs
      .getChildren(dir)
      .map(({ name }) => name)
      .sort()
      .map((name) => {
        const child = ctx.fs.getChildInode(dir, name)
        let display = name, value = name
        if (! child) {
          display = chalk.redBright(display)
        }
        else if (child.file.type === FileT.DIR) {
          display = chalk.blueBright(display) + '/'
          value += '/'
        }
        else if (ctx.exec.isExecutable(child)) {
          display = chalk.greenBright(display) + '*'
        }
        return { value, display }
      }),
    { cursorToken: etoken, startIndex: etoken.content.length - filename.length },
  )
}

export const createHsh = ({
  builtins,
}: HshConfig): Program => createCommand('hsh', '[FILE]', 'Human SHell')
  .help('help')
  .option('command', '-c', 'string', 'Execute command')
  .program(async ({ proc, options }, path) => {
    const { ctx, env, stdio } = proc
    proc.cwd = env.HOME
    proc.jobTable = new JobTable()

    const executeLine = async (proc: Process, line: string) => {
      const parseResult = Result.wrap<HshAstScript, unknown>(() => {
        const tokens = tokenize(line)
        const etokens = expand(tokens, env)
        return parse(etokens)
      })
      if (parseResult.isErr) {
        proc.error(parseResult.err)
        proc.env['?'] = '130'
        return
      }
      await executeScript(proc, parseResult.val, builtins, { source: line })
      return getShellExitRequest(proc)
    }

    if (options.command) {
      const lines = options.command.split('\n')
      for (const line of lines) {
        await executeLine(proc, line)
        if (getShellExitRequest(proc)) break
      }
    }

    else if (! path) {
      const historyFile = ctx.fs.openU('.hsh_history', 'ra').handle

      const readline = new Readline(proc, stdio, ctx.term)
      const loop = readline.createLoop({
        history: new ReadlineHistory(historyFile.read().split('\n')),
        prompt: () => `${chalk.blueBright(env.PWD)} ${chalk.greenBright('$')} `,
        onComp: getCompProvider(proc, builtins),
        onLine: async (line) => {
          if (line === '\x03') return
          if (line === '\x04') {
            stdio.writeLn('')
            loop.stop()
            return
          }
          await executeLine(proc, line)
          historyFile.appendLn(line)
          if (getShellExitRequest(proc)) loop.stop()
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
        if (getShellExitRequest(proc)) break
      }
    }

    return getShellExitRequest(proc) ?? 0
  })
