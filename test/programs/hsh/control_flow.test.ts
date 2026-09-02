import { describe, expect, it, vi } from 'vitest'
import stripAnsi from 'strip-ansi'
import { parseControlScript } from '@/programs/hsh/script'
import { createHsh, executeControlScript } from '@/programs/hsh'
import { echo } from '@/programs/echo'
import { bracket } from '@/programs/test'
import { breakLoop, continueLoop } from '@/programs/loop_control'
import { Context } from '@/sys0/context'
import { FRead, Fs, FWrite } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import { Process } from '@/sys0/proc'
import { signalExit } from '@/sys0/process_exit'
import { Program } from '@/sys0/program'
import { ProcessTable } from '@/sys0/process_table'
import { Stdio } from '@/sys0/stdio'
import { Term } from '@/sys0/term'

class EmptyInput implements FRead {
  readKey() { return '\x04' }
  read() { return '' }
  readUntil() { return '' }
  readLn() { return '' }
}

class MemoryOutput implements FWrite {
  content = ''
  write(data: string) { this.content += data }
  writeLn(data: string) { this.write(data + '\n') }
}

class KeyInput implements FRead {
  constructor(private readonly keys: string[]) {}

  readKey() {
    const key = this.keys.shift()
    if (key === undefined) throw new Error('Shell requested an unexpected key')
    return key
  }

  read() { return '' }
  readUntil() { return '' }
  readLn() { return '' }
}

const deferred = <T>() => {
  let resolve: (value: T) => void = value => void value
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

const createShell = () => {
  const output = new MemoryOutput()
  const error = new MemoryOutput()
  const context = {
    fs: new Fs(Vfs.dir({}), { persistence: new MemoryFsPersistence() }),
    processes: new ProcessTable(),
  } as Context
  const process = new Process(context, null, {
    name: 'hsh',
    env: { HOME: '/', PATH: '/bin', PWD: '/' },
    stdio: new Stdio(new EmptyInput(), output, error),
  })
  return { error, output, process }
}

const run = async (source: string, builtins: Record<string, Program>) => {
  const shell = createShell()
  const status = await executeControlScript(shell.process, parseControlScript(source), builtins)
  return { ...shell, status }
}

describe('hsh control-flow execution', () => {
  it('uses the bracket builtin as an if condition', async () => {
    const emit: Program = (proc, _self, value) => proc.stdio.writeLn(value) ?? 0
    const result = await run(`
      if [ 3 -gt 2 ]; then emit yes; fi
      if [ "" ]; then emit no; else emit fallback; fi
    `, { '[': bracket, emit })

    expect(result.output.content).toBe('yes\nfallback\n')
    expect(result.error.content).toBe('')
  })

  it('executes double-bracket conditions with shell logical operators', async () => {
    const emit: Program = (proc, _self, value) => proc.stdio.writeLn(value) ?? 0
    const result = await run(`
      VALUE="hello world"
      [[ "$VALUE" == "hello world" && ( 4 -gt 2 || -n "$MISSING" ) ]] && emit yes
      [[ -z "$VALUE" ]] || emit fallback
    `, { emit })

    expect(result.output.content).toBe('yes\nfallback\n')
    expect(result.error.content).toBe('')
    expect(result.status.code).toBe(0)
  })

  it('does not split unquoted double-bracket variable expansions', async () => {
    const emit: Program = (proc, _self, value) => proc.stdio.writeLn(value) ?? 0
    const result = await run(`
      VALUE="two words"
      [[ $VALUE == "two words" ]] && emit preserved
    `, { emit })

    expect(result.output.content).toBe('preserved\n')
    expect(result.status.code).toBe(0)
  })

  it('matches unquoted double-bracket patterns and quotes literal fragments', async () => {
    const emit: Program = (proc, _self, value) => proc.stdio.writeLn(value) ?? 0
    const result = await run(`
      VALUE=foobar
      PATTERN='foo*'
      [[ $VALUE == foo* ]] && emit star
      [[ $VALUE == $PATTERN ]] && emit variable
      [[ $VALUE != "$PATTERN" ]] && emit quoted-variable
      [[ 'foo*' == foo\\* ]] && emit escaped-star
      [[ b == [a-c] ]] && emit class
      [[ d == [!a-c] ]] && emit negated-class
      [[ preXpost == pre"X"p* ]] && emit partial
      [[ "\${MISSING:-a b}" == 'a b' ]] && emit parameter-word
    `, { emit })

    expect(result.output.content).toBe(
      'star\n' +
      'variable\n' +
      'quoted-variable\n' +
      'escaped-star\n' +
      'class\n' +
      'negated-class\n' +
      'partial\n' +
      'parameter-word\n',
    )
    expect(result.error.content).toBe('')
  })

  it('short-circuits double-bracket operand expansion', async () => {
    const sideEffect = vi.fn(() => 0)
    const result = await run(`
      [[ yes == yes || $(side-effect) ]]
      [[ no == yes && $(side-effect) ]]
    `, { 'side-effect': sideEffect })

    expect(sideEffect).not.toHaveBeenCalled()
    expect(result.error.content).toBe('')
  })

  it('persists assignments performed by parameter expansion', async () => {
    const result = await run('echo ${created:=value}', { echo })

    expect(result.output.content).toBe('value\n')
    expect(result.process.env.created).toBe('value')
    expect(result.process.variables.isExported('created')).toBe(false)
  })

  it('captures command substitution output in an isolated subshell', async () => {
    const emit: Program = (proc, _self, ...args) => proc.stdio.writeLn(args.join(' ')) ?? 0
    const result = await run(`
      VALUE=outer
      emit "$(VALUE=inner; emit $VALUE; emit second)"
      emit $(emit "two words")
      emit $VALUE
    `, { emit })

    expect(result.output.content).toBe('inner\nsecond\ntwo words\nouter\n')
    expect(result.process.env.VALUE).toBe('outer')
  })

  it('executes lists and short-circuits && and ||', async () => {
    const emit: Program = (proc, _self, value) => proc.stdio.writeLn(value) ?? 0
    const { output, status } = await run(
      'ok && emit first; fail && emit skipped; fail || emit recovered; ok || emit skipped-too',
      { ok: () => 0, fail: () => 7, emit },
    )

    expect(output.content).toBe('first\nrecovered\n')
    expect(status.code).toBe(0)
  })

  it('selects if, elif, and else branches by command status', async () => {
    const emit: Program = (proc, _self, value) => proc.stdio.writeLn(value) ?? 0
    const { output } = await run(`
      if fail; then emit wrong
      elif ok; then emit elif
      else emit wrong
      fi
      if fail; then emit wrong; else emit else; fi
    `, { ok: () => 0, fail: () => 1, emit })

    expect(output.content).toBe('elif\nelse\n')
  })

  it('reevaluates while and until conditions and expands each loop body at execution time', async () => {
    const check: Program = (proc) => {
      const next = Number(proc.env.count ?? 0) + 1
      proc.env.count = String(next)
      return next <= 3 ? 0 : 1
    }
    const wait: Program = (proc) => {
      const next = Number(proc.env.untilCount ?? 0) + 1
      proc.env.untilCount = String(next)
      return next >= 3 ? 0 : 1
    }
    const emit: Program = (proc, _self, value) => proc.stdio.writeLn(value) ?? 0
    const { output } = await run(`
      while check; do emit w$count; done
      until wait; do emit u$untilCount; done
    `, { check, wait, emit })

    expect(output.content).toBe('w1\nw2\nw3\nu1\nu2\n')
  })

  it('iterates for words and leaves the final loop variable assigned', async () => {
    const emit: Program = (proc, _self, value) => proc.stdio.writeLn(value) ?? 0
    const result = await run(
      'for item in alpha beta gamma; do emit $item; done',
      { emit },
    )

    expect(result.output.content).toBe('alpha\nbeta\ngamma\n')
    expect(result.process.env.item).toBe('gamma')
  })

  it('expands variable brace ranges from the current loop environment', async () => {
    const emit: Program = (proc, _self, ...values) => proc.stdio.writeLn(values.join(' ')) ?? 0
    const result = await run(
      'for i in 1 2 3; do emit {0..$i}; done',
      { emit },
    )

    expect(result.output.content).toBe('0 1\n0 1 2\n0 1 2 3\n')
  })

  it('stops a foreground for loop when its current command receives SIGINT', async () => {
    const started = deferred<void>()
    const shell = createShell()
    const sleep: Program = proc => new Promise((resolve) => {
      const subscription = proc.on('signal', (signal) => {
        subscription.dispose()
        resolve(signalExit(signal))
      })
      started.resolve()
    })
    const running = executeControlScript(
      shell.process,
      parseControlScript('for i in {1..5}; do echo $i; sleep 1; done'),
      { echo, sleep },
    )

    await started.promise
    shell.process.signalForeground('SIGINT')
    const status = await running

    expect(status).toEqual(signalExit('SIGINT'))
    expect(shell.process.env['?']).toBe('130')
    expect(shell.process.env.i).toBe('1')
    expect(shell.output.content).toBe('1\n\n')
  })

  it('stops the current body for break and continue', async () => {
    const emit: Program = (proc, _self, value) => proc.stdio.writeLn(value) ?? 0
    const continued = await run(
      'for item in a b; do emit before-$item; continue; emit wrong; done',
      { emit, continue: continueLoop },
    )
    const broken = await run(
      'for item in a b; do emit $item; break; emit wrong; done',
      { emit, break: breakLoop },
    )

    expect(continued.output.content).toBe('before-a\nbefore-b\n')
    expect(broken.output.content).toBe('a\n')
  })

  it('propagates numbered loop control across nested loops', async () => {
    const emit: Program = (proc, _self, value) => proc.stdio.writeLn(value) ?? 0
    const broken = await run(`
      for outer in a b; do
        for inner in x y; do emit $outer-$inner; break 2; done
        emit wrong
      done
      emit finished
    `, { emit, break: breakLoop })
    const continued = await run(`
      for outer in a b; do
        for inner in x y; do emit $outer-$inner; continue 2; done
        emit wrong
      done
    `, { emit, continue: continueLoop })

    expect(broken.output.content).toBe('a-x\nfinished\n')
    expect(continued.output.content).toBe('a-x\nb-x\n')
  })

  it('reports break and continue used outside loops', async () => {
    const broken = await run('break', { break: breakLoop })
    const continued = await run('continue', { continue: continueLoop })

    expect(broken.status.code).toBe(1)
    expect(broken.error.content).toContain('only meaningful in a loop')
    expect(continued.status.code).toBe(1)
    expect(continued.error.content).toContain('only meaningful in a loop')
  })

  it('runs a background compound statement in an isolated child process', async () => {
    const release = deferred<number>()
    const started = deferred<Process>()
    const shell = createShell()
    shell.process.variables.set('LOCAL_ONLY', 'visible in subshell')
    const mutate: Program = async (child) => {
      expect(await child.stdio.read()).toBe('')
      expect(child.env.LOCAL_ONLY).toBe('visible in subshell')
      child.stdio.writeLn('compound output')
      child.env.CHILD_ONLY = 'yes'
      started.resolve(child)
      return release.promise
    }
    const emit: Program = (proc, _self, value) => proc.stdio.writeLn(value) ?? 0
    const script = parseControlScript(`
      if true; then mutate; fi &
      emit foreground
    `)

    const status = await executeControlScript(shell.process, script, {
      true: () => 0,
      mutate,
      emit,
    })
    const child = await started.promise
    const job = shell.process.jobTable?.get(1)

    expect(status.code).toBe(0)
    expect(child.isForeground).toBe(false)
    expect(shell.process.env.CHILD_ONLY).toBeUndefined()
    expect(shell.process.env['!']).toBe(child.pid.toString())
    expect(job?.command).toContain('if true; then mutate; fi &')
    expect(job?.state).toBe('running')
    expect(shell.output.content).toContain('foreground\n')
    expect(shell.output.content.indexOf(`[1] ${child.pid}\n`))
      .toBeLessThan(shell.output.content.indexOf('compound output\n'))

    release.resolve(7)
    await expect(job?.completion).resolves.toMatchObject({ code: 7 })
    expect(job?.state).toBe('completed')
  })

  it('keeps a background compound pipeline in the job process group', async () => {
    const release = deferred<number>()
    const leftStarted = deferred<Process>()
    const rightStarted = deferred<Process>()
    const shell = createShell()
    const left: Program = (child) => {
      leftStarted.resolve(child)
      return release.promise
    }
    const right: Program = (child) => {
      rightStarted.resolve(child)
      return release.promise
    }

    await executeControlScript(
      shell.process,
      parseControlScript('if true; then left | right; fi &'),
      { true: () => 0, left, right },
    )
    const [leftProcess, rightProcess] = await Promise.all([
      leftStarted.promise,
      rightStarted.promise,
    ])
    const job = shell.process.jobTable?.get(1)

    expect(job?.group.values()).toEqual(expect.arrayContaining([
      leftProcess,
      rightProcess,
    ]))
    release.resolve(0)
    await job?.completion
    expect(job?.group.size).toBe(0)
  })

  it('parses command mode as one multiline script', async () => {
    const shell = createShell()
    const emit: Program = (proc, _self, value) => proc.stdio.writeLn(value) ?? 0
    const hsh = createHsh({ builtins: { ok: () => 0, emit } })

    await expect(hsh(shell.process, 'hsh', '-c', `
      if ok
      then
        emit yes
      fi
    `)).resolves.toBe(0)
    expect(shell.output.content).toBe('yes\n')
  })

  it('uses a continuation prompt for incomplete interactive statements', async () => {
    const output = new MemoryOutput()
    const error = new MemoryOutput()
    const term = {
      buffer: { active: { cursorX: 0 } },
      cols: 80,
      doEcho: true,
      getStringWidth: (value: string) => value.length,
    } as unknown as Term
    const context = {
      fs: new Fs(Vfs.dir({}), { persistence: new MemoryFsPersistence() }),
      processes: new ProcessTable(),
      term,
    } as Context
    const process = new Process(context, null, {
      name: 'hsh',
      env: { HOME: '/', PATH: '/bin', PWD: '/' },
      stdio: new Stdio(new KeyInput([
        'if', '\r',
        'ok', '\r',
        'then', '\r',
        'emit yes', '\r',
        'fi', '\r',
        '\x04',
      ]), output, error),
    })
    const emit: Program = (proc, _self, value) => proc.stdio.writeLn(value) ?? 0
    const hsh = createHsh({ builtins: { ok: () => 0, emit } })

    await expect(hsh(process, 'hsh')).resolves.toBe(0)
    expect(stripAnsi(output.content).match(/> /g)).toHaveLength(4)
    expect(output.content).toContain('yes\n')
    expect(error.content).toBe('')
  })

  it('continues double-bracket input until the closing word', async () => {
    const output = new MemoryOutput()
    const error = new MemoryOutput()
    const term = {
      buffer: { active: { cursorX: 0 } },
      cols: 80,
      doEcho: true,
      getStringWidth: (value: string) => value.length,
    } as unknown as Term
    const context = {
      fs: new Fs(Vfs.dir({}), { persistence: new MemoryFsPersistence() }),
      processes: new ProcessTable(),
      term,
    } as Context
    const process = new Process(context, null, {
      name: 'hsh',
      env: { HOME: '/', PATH: '/bin', PWD: '/' },
      stdio: new Stdio(new KeyInput([
        '[[', '\r',
        'value == value', '\r',
        ']] && echo yes', '\r',
        '\x04',
      ]), output, error),
    })
    const hsh = createHsh({ builtins: { echo } })

    await expect(hsh(process, 'hsh')).resolves.toBe(0)
    expect(stripAnsi(output.content).match(/> /g)).toHaveLength(2)
    expect(output.content).toContain('yes\n')
    expect(error.content).toBe('')
  })

  it('continues the interactive shell after an arithmetic expansion error', async () => {
    const output = new MemoryOutput()
    const error = new MemoryOutput()
    const term = {
      buffer: { active: { cursorX: 0 } },
      cols: 80,
      doEcho: true,
      getStringWidth: (value: string) => value.length,
    } as unknown as Term
    const context = {
      fs: new Fs(Vfs.dir({}), { persistence: new MemoryFsPersistence() }),
      processes: new ProcessTable(),
      term,
    } as Context
    const process = new Process(context, null, {
      name: 'hsh',
      env: { HOME: '/', PATH: '/bin', PWD: '/' },
      stdio: new Stdio(new KeyInput([
        'echo $((1 / 0))', '\r',
        'echo survived', '\r',
        '\x04',
      ]), output, error),
    })
    const hsh = createHsh({ builtins: { echo } })

    await expect(hsh(process, 'hsh')).resolves.toBe(0)

    expect(error.content).toContain('Division by zero in arithmetic expansion')
    expect(output.content).toContain('survived\n')
  })
})
