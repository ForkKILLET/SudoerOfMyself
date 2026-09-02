import { chalk } from '@/utils/color'

import { Process } from '@/sys0/proc'
import { createCommand, Program } from '@/sys0/program'
import { FileT, FOp, FRead, FWrite } from '@/sys0/fs'
import { Path } from '@/sys0/fs/path'
import { CompCandidate, CompProvider, Readline, ReadlineHistory } from '@/sys0/readline'
import { Stdio } from '@/sys0/stdio'

import {
  expand,
  HSH_CHARS,
  HshAstCommand,
  HshAstScript,
  HshTokenText,
  parseEnvAssignment,
  parseLine,
  tokenize,
} from './parse'
import { MakeOptional } from '@/utils/types'
import { isBetween } from '@/utils'
import { Result } from 'fk-result'
import { ExecErrorT } from '@/sys0/exec'
import { normalExit, normalizeExit, ProcessExit } from '@/sys0/process_exit'
import { createPipe } from '@/sys0/pipe'
import { formatJobCompletion, JobTable, ProcessGroup } from '@/sys0/job'
import {
  consumeLoopControlAtBoundary,
  enterShellLoop,
  getLoopControlRequest,
  getShellExitRequest,
  leaveShellLoop,
} from './control'
import { initializeShellParameters, updateLastArgument } from './parameters'
import { errorMessage, UserError } from '@/utils/errors'
import {
  displayFdError,
  type FdError,
  readableFileTarget,
  writableFileTarget,
} from '@/sys0/fd'
import {
  type HshControlScript,
  type HshForStatement,
  type HshIfStatement,
  type HshLoopStatement,
  type HshStatement,
  IncompleteHshScriptError,
  parseControlScript,
} from './script'

export type ProgramRegistry = Readonly<Record<string, Program>>

const isInterruptExit = (status: ProcessExit) => (
  status.reason === 'signal' && status.signal === 'SIGINT'
)

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
  const assignmentEnv = command.assignments
    ? Object.fromEntries(command.assignments.map(({ name, value }) => [name, value]))
    : undefined

  if (! name) {
    command.assignments?.forEach(({ name, value }) => {
      proc.variables.set(name, value)
    })
    return normalExit(0)
  }

  const getStdio = () => {
    const fds = proc.stdio.fds.fork()
    const unwrapFd = <T>(result: Result<T, FdError>) => result.unwrapBy((error) => {
      throw new UserError(displayFdError(error))
    })
    try {
      if (options.input) unwrapFd(fds.replace(0, readableFileTarget(options.input)))
      if (options.output) unwrapFd(fds.replace(1, writableFileTarget(options.output)))
      command.redirections?.forEach((redirection) => {
        switch (redirection.type) {
          case 'readFrom': {
            const handle = ctx.fs.openU(redirection.path, 'r', proc.cwd).handle
            unwrapFd(fds.replace(redirection.fd, readableFileTarget(handle)))
            break
          }
          case 'writeTo':
          case 'appendTo': {
            const mode = redirection.type === 'appendTo' ? 'a' : 'w'
            const handle = ctx.fs.openU(redirection.path, mode, proc.cwd).handle
            unwrapFd(fds.replace(redirection.fd, writableFileTarget(handle)))
            break
          }
          case 'duplicate':
            unwrapFd(fds.duplicate(redirection.sourceFd, redirection.fd))
            break
          case 'close':
            unwrapFd(fds.closeIfOpen(redirection.fd))
            break
        }
      })

      return new Stdio(fds)
    }
    catch (error) {
      fds.closeAll()
      throw error
    }
  }

  const commandStdio = getStdio()
  if (name in builtins) {
    if (options.pipelineStage) {
      return proc.spawn(builtins[name], {
        name,
        stdio: commandStdio,
        env: assignmentEnv,
        inheritShellVariables: true,
        processGroup: options.processGroup,
        foreground: options.foreground,
      }, ...args)
    }

    const previousAssignments = new Map<string, {
      existed: boolean
      exported: boolean
      value?: string
    }>()
    command.assignments?.forEach(({ name, value }) => {
      if (! previousAssignments.has(name)) {
        previousAssignments.set(name, {
          existed: Object.hasOwn(env, name),
          exported: proc.variables.isExported(name),
          value: env[name],
        })
      }
      proc.variables.set(name, value, { exported: true })
    })
    const originalStdio = proc.stdio
    const originalName = proc.name
    proc.stdio = commandStdio
    proc.name = name
    try {
      return normalizeExit(await builtins[name](proc, name, ...args))
    }
    catch (err) {
      proc.error(err)
      return normalExit(1)
    }
    finally {
      previousAssignments.forEach(({ existed, exported, value }, name) => {
        if (existed) proc.variables.set(name, value !, { exported })
        else proc.variables.unset(name)
      })
      proc.stdio = originalStdio
      commandStdio.close()
      proc.name = originalName
    }
  }
  else {
    const exeRes = ctx.exec.resolve(name, {
      envPath: assignmentEnv?.PATH ?? env.PATH,
      cwd: env.PWD,
    })
    if (exeRes.isErr) {
      try {
        switch (exeRes.err.type) {
          case ExecErrorT.NOT_FOUND:
            commandStdio.writeErrorLn(`${name}: Command not found`)
            return normalExit(127)
          case ExecErrorT.NOT_EXECUTABLE:
            commandStdio.writeErrorLn(`${name}: Not an executable`)
            return normalExit(126)
          case ExecErrorT.NATIVE_PROGRAM_NOT_REGISTERED:
            commandStdio.writeErrorLn(
              `${name}: Native program '${exeRes.err.programId}' is not registered`,
            )
            return normalExit(126)
          case ExecErrorT.FILE_SYSTEM_ERROR:
            commandStdio.writeErrorLn(`${name}: ${FOp.displayError(exeRes.err.error)}`)
            return normalExit(126)
        }
      }
      finally {
        commandStdio.close()
      }
      throw new Error('Unknown executable resolution error')
    }
    return proc.spawn(exeRes.val.program, {
      name,
      stdio: commandStdio,
      env: assignmentEnv,
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
    })
  })
  return Promise.all(runs)
}

export const executeScript = async (
  proc: Process,
  script: HshAstScript,
  builtins: ProgramRegistry,
  { source }: { source?: string } = {},
): Promise<ProcessExit> => {
  let lastStatus = normalExit(0)
  let commandIndex = 0
  while (commandIndex < script.commands.length) {
    const pipeline: HshAstCommand[] = []
    do {
      const command = script.commands[commandIndex ++]
      pipeline.push(command)
      if (! command.pipeToNext) break
    } while (commandIndex < script.commands.length)

    const processGroup = ! script.background && proc.processGroup
      ? proc.processGroup
      : new ProcessGroup()
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
      proc.variables.set('!', processGroup.pgid?.toString() ?? '', { exported: false })
      proc.variables.set('?', '0', { exported: false })
      const lastCommand = pipeline.at(- 1)
      if (lastCommand?.name) updateLastArgument(proc, lastCommand)
      proc.stdio.writeLn(`[${job.id}] ${processGroup.pgid ?? '-'}`)
      return normalExit(0)
    }

    const exitStatuses = await executePipeline(proc, pipeline, builtins, {
      processGroup,
      foreground: true,
    })
    const interruptStatus = exitStatuses.find(isInterruptExit)
    if (interruptStatus) {
      proc.stdio.writeLn('')
    }
    lastStatus = interruptStatus ?? exitStatuses.at(- 1) ?? normalExit(0)
    proc.variables.set('?', lastStatus.code.toString(), { exported: false })
    const lastCommand = pipeline.at(- 1)
    if (lastCommand?.name) updateLastArgument(proc, lastCommand)
    const exitRequest = getShellExitRequest(proc)
    if (exitRequest) return exitRequest
    if (interruptStatus) return interruptStatus
  }
  return lastStatus
}

const setLastStatus = (proc: Process, status: ProcessExit) => {
  proc.variables.set('?', status.code.toString(), { exported: false })
  return status
}

const executeIf = async (
  proc: Process,
  statement: HshIfStatement,
  builtins: ProgramRegistry,
): Promise<ProcessExit> => {
  for (const branch of statement.branches) {
    const conditionStatus = await executeControlScript(proc, branch.condition, builtins)
    if (
      isInterruptExit(conditionStatus)
      || getShellExitRequest(proc)
      || getLoopControlRequest(proc)
    ) return conditionStatus
    if (conditionStatus.code === 0) {
      return executeControlScript(proc, branch.body, builtins)
    }
  }
  if (statement.elseBody) return executeControlScript(proc, statement.elseBody, builtins)
  return setLastStatus(proc, normalExit(0))
}

const executeLoopIteration = async (
  proc: Process,
  body: HshControlScript,
  builtins: ProgramRegistry,
) => {
  const status = await executeControlScript(proc, body, builtins)
  return { status, action: consumeLoopControlAtBoundary(proc) }
}

const executeLoop = async (
  proc: Process,
  statement: HshLoopStatement,
  builtins: ProgramRegistry,
): Promise<ProcessExit> => {
  let lastStatus = normalExit(0)
  enterShellLoop(proc)
  try {
    while (true) {
      const conditionStatus = await executeControlScript(proc, statement.condition, builtins)
      if (isInterruptExit(conditionStatus) || getShellExitRequest(proc)) return conditionStatus
      const conditionAction = consumeLoopControlAtBoundary(proc)
      if (conditionAction) {
        if (conditionAction === 'continue') continue
        break
      }
      const shouldRun = statement.type === 'while'
        ? conditionStatus.code === 0
        : conditionStatus.code !== 0
      if (! shouldRun) break

      const iteration = await executeLoopIteration(proc, statement.body, builtins)
      lastStatus = iteration.status
      if (isInterruptExit(lastStatus) || getShellExitRequest(proc)) return lastStatus
      if (iteration.action === 'continue') continue
      if (iteration.action) break
    }
  }
  finally {
    leaveShellLoop(proc)
  }
  return setLastStatus(proc, lastStatus)
}

const expandForWords = (proc: Process, statement: HshForStatement) => {
  if (! statement.wordsSource) return []
  const tokens = expand(tokenize(statement.wordsSource), proc.env)
  return tokens.map((token) => {
    if (token.type !== 'text') throw new UserError(`Unexpected ${token.type} in for word list`)
    return token.content
  })
}

const executeFor = async (
  proc: Process,
  statement: HshForStatement,
  builtins: ProgramRegistry,
): Promise<ProcessExit> => {
  const words = expandForWords(proc, statement)
  let lastStatus = normalExit(0)
  enterShellLoop(proc)
  try {
    for (const word of words) {
      proc.variables.set(statement.name, word)
      const iteration = await executeLoopIteration(proc, statement.body, builtins)
      lastStatus = iteration.status
      if (isInterruptExit(lastStatus) || getShellExitRequest(proc)) return lastStatus
      if (iteration.action === 'continue') continue
      if (iteration.action) break
    }
  }
  finally {
    leaveShellLoop(proc)
  }
  return setLastStatus(proc, lastStatus)
}

const executeStatement = async (
  proc: Process,
  statement: HshStatement,
  builtins: ProgramRegistry,
): Promise<ProcessExit> => {
  switch (statement.type) {
    case 'simple':
      return executeScript(proc, parseLine(statement.source, proc.env), builtins, {
        source: statement.source,
      })
    case 'if': return executeIf(proc, statement, builtins)
    case 'while':
    case 'until': return executeLoop(proc, statement, builtins)
    case 'for': return executeFor(proc, statement, builtins)
  }
}

const createBackgroundStdio = (proc: Process) => {
  const eofInput = createPipe()
  eofInput.writer.close()
  const fds = proc.stdio.fds.fork()
  const replaced = fds.replace(0, readableFileTarget(eofInput.reader))
  if (replaced.isErr) {
    fds.closeAll()
    throw new UserError(displayFdError(replaced.err))
  }
  return new Stdio(fds)
}

const executeBackgroundStatement = (
  proc: Process,
  statement: HshStatement,
  builtins: ProgramRegistry,
  source?: string,
) => {
  const processGroup = new ProcessGroup()
  const completion = proc.spawn(
    child => executeStatement(child, statement, builtins),
    {
      name: 'hsh',
      stdio: createBackgroundStdio(proc),
      processGroup,
      foreground: false,
      inheritShellVariables: true,
    },
  )
  proc.jobTable ??= new JobTable()
  const job = proc.jobTable.create(
    processGroup,
    `${source ?? statement.type} &`,
    completion,
  )
  proc.variables.set('!', processGroup.pgid?.toString() ?? '', { exported: false })
  proc.stdio.writeLn(`[${job.id}] ${processGroup.pgid ?? '-'}`)
  return setLastStatus(proc, normalExit(0))
}

export const executeControlScript = async (
  proc: Process,
  script: HshControlScript,
  builtins: ProgramRegistry,
): Promise<ProcessExit> => {
  let lastStatus = normalExit(0)
  for (const entry of script.entries) {
    if (getShellExitRequest(proc) || getLoopControlRequest(proc)) break
    const shouldRun = entry.condition === 'always'
      || (entry.condition === 'success' && lastStatus.code === 0)
      || (entry.condition === 'failure' && lastStatus.code !== 0)
    if (! shouldRun) continue
    lastStatus = entry.background
      ? executeBackgroundStatement(proc, entry.statement, builtins, entry.source)
      : await executeStatement(proc, entry.statement, builtins)
    if (isInterruptExit(lastStatus)) return setLastStatus(proc, lastStatus)
  }
  return setLastStatus(proc, lastStatus)
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

  const [, token] = [...tokens.entries()]
    .find(([, token]) => isBetween(line.cursor - 1, token.begin, token.end))
    ?? getEmptyTokenEntry()
  const [expandedTokenIndex, etoken] = [...etokens.entries()]
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
    const names = [...new Set([...Object.keys(env), ...HSH_CHARS.senv])].sort()
    return getCandidates(names.map(name => ({ value: '$' + name })))
  }

  const isExplicitPath = Path.isAbsOrRel(token.content)

  let previousPipeIndex = - 1
  if (expandedTokenIndex !== null) {
    for (let index = expandedTokenIndex - 1; index >= 0; index --) {
      if (etokens[index].type !== 'pipe') continue
      previousPipeIndex = index
      break
    }
  }
  const commandPrefix = expandedTokenIndex === null
    ? []
    : etokens.slice(previousPipeIndex + 1, expandedTokenIndex)
  const isAssignment = etoken.type === 'text' && parseEnvAssignment(etoken.content)
  const isCommandToken = ! isAssignment
    && commandPrefix.every(token => token.type === 'text' && parseEnvAssignment(token.content))
  if (isCommandToken && ! isExplicitPath) {
    const commandEnv = Object.fromEntries(commandPrefix.flatMap((token) => {
      if (token.type !== 'text') return []
      const assignment = parseEnvAssignment(token.content)
      return assignment ? [[assignment.name, assignment.value]] : []
    }))
    const installedPrograms = ctx.exec.listInPath(commandEnv.PATH ?? env.PATH, env.PWD)
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
  .program(async ({ proc, name, options }, path, ...scriptArgs) => {
    const { ctx, env, stdio } = proc
    proc.cwd = env.HOME
    proc.jobTable = new JobTable()
    initializeShellParameters(proc, path ?? name, scriptArgs)

    const executeSource = async (proc: Process, source: string) => {
      const parseResult = Result.wrap<HshControlScript, unknown>(() => {
        return parseControlScript(source)
      })
      if (parseResult.isErr) {
        proc.error(parseResult.err)
        proc.variables.set('?', '2', { exported: false })
        return false
      }
      await executeControlScript(proc, parseResult.val, builtins)
      try {
        await ctx.fs.flush()
      }
      catch (error) {
        proc.error(`file system save failed: ${errorMessage(error)}`)
      }
      return true
    }

    if (options.command) {
      await executeSource(proc, options.command)
    }

    else if (! path) {
      const historyFile = ctx.fs.openU('.hsh_history', 'ra').handle
      let pendingSource = ''

      const readline = new Readline(proc, stdio, ctx.term)
      const loop = readline.createLoop({
        history: new ReadlineHistory(historyFile.read().split('\n')),
        prompt: () => pendingSource
          ? `${chalk.greenBright('>')} `
          : `${chalk.blueBright(env.PWD)} ${chalk.greenBright('$')} `,
        onComp: getCompProvider(proc, builtins),
        onLine: async (line) => {
          if (line === '\x03') {
            pendingSource = ''
            return
          }
          if (line === '\x04') {
            if (pendingSource) {
              const result = Result.wrap(() => parseControlScript(pendingSource))
              if (result.isErr) proc.error(result.err)
              proc.variables.set('?', '2', { exported: false })
              pendingSource = ''
              return
            }
            stdio.writeLn('')
            loop.stop()
            return
          }
          historyFile.appendLn(line)
          const source = pendingSource ? `${pendingSource}\n${line}` : line
          const parseResult = Result.wrap(() => parseControlScript(source))
          if (parseResult.isErr && parseResult.err instanceof IncompleteHshScriptError) {
            pendingSource = source
            return
          }
          pendingSource = ''
          if (parseResult.isErr) {
            proc.error(parseResult.err)
            proc.variables.set('?', '2', { exported: false })
          }
          else {
            await executeControlScript(proc, parseResult.val, builtins)
            try {
              await ctx.fs.flush()
            }
            catch (error) {
              proc.error(`file system save failed: ${errorMessage(error)}`)
            }
          }
          if (getShellExitRequest(proc)) loop.stop()
        },
        onInterrupt: () => {
          pendingSource = ''
          return true
        },
        onEnd: () => stdio.writeLn('[Process exited]'),
      })
      const jobTable = proc.jobTable
      const jobCompletionSubscription = jobTable.on('completed', (job) => {
        readline.writeAbove(formatJobCompletion(job, jobTable.markerFor(job)))
      })
      try {
        await loop.start()
      }
      finally {
        jobCompletionSubscription.dispose()
      }
    }

    else {
      const fh = ctx.fs.openU(path, 'r').handle
      await executeSource(proc, fh.read())
    }

    return getShellExitRequest(proc) ?? Number.parseInt(env['?'], 10)
  })
