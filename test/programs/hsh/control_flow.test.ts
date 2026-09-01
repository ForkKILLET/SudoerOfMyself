import { describe, expect, it } from 'vitest'
import stripAnsi from 'strip-ansi'
import { parseControlScript } from '@/programs/hsh/script'
import { createHsh, executeControlScript } from '@/programs/hsh'
import { breakLoop, continueLoop } from '@/programs/loop_control'
import { Context } from '@/sys0/context'
import { FRead, Fs, FWrite } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import { Process } from '@/sys0/proc'
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
        'if ok', '\r',
        'then emit yes', '\r',
        'fi', '\r',
        '\x04',
      ]), output, error),
    })
    const emit: Program = (proc, _self, value) => proc.stdio.writeLn(value) ?? 0
    const hsh = createHsh({ builtins: { ok: () => 0, emit } })

    await expect(hsh(process, 'hsh')).resolves.toBe(0)
    expect(stripAnsi(output.content)).toContain('> ')
    expect(output.content).toContain('yes\n')
    expect(error.content).toBe('')
  })
})
