import { describe, expect, it } from 'vitest'
import { bracket, test } from '@/programs/test'
import { Context } from '@/sys0/context'
import { ExecService } from '@/sys0/exec'
import { FRead, Fs, FWrite } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import { Process } from '@/sys0/proc'
import { ProcessTable } from '@/sys0/process_table'
import { Stdio } from '@/sys0/stdio'

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

const createProcess = () => {
  const output = new MemoryOutput()
  const error = new MemoryOutput()
  const fs = new Fs(Vfs.dir({
    empty: Vfs.normal(''),
    file: Vfs.normal('contents'),
    dir: Vfs.dir(),
    executable: Vfs.nativeExe('executable'),
  }), { persistence: new MemoryFsPersistence() })
  const context = {
    fs,
    exec: new ExecService(fs, { executable: () => 0 }),
    processes: new ProcessTable(),
  } as Context
  const process = new Process(context, null, {
    name: 'hsh',
    cwd: '/',
    env: { HOME: '/', PATH: '/', PWD: '/' },
    stdio: new Stdio(new EmptyInput(), output, error),
  })
  return { error, output, process }
}

describe('test and [ builtins', () => {
  it('evaluates empty, string, and integer expressions', async () => {
    const { process } = createProcess()

    expect(await test(process, 'test')).toBe(1)
    expect(await test(process, 'test', 'value')).toBe(0)
    expect(await test(process, 'test', '!')).toBe(0)
    expect(await test(process, 'test', '-n')).toBe(0)
    expect(await test(process, 'test', '(')).toBe(0)
    expect(await test(process, 'test', '-z', '')).toBe(0)
    expect(await test(process, 'test', '-n', '')).toBe(1)
    expect(await test(process, 'test', 'left', '!=', 'right')).toBe(0)
    expect(await test(process, 'test', 'foobar', '=', 'foo*')).toBe(1)
    expect(await test(process, 'test', '-2', '-lt', '10')).toBe(0)
    expect(await test(process, 'test', '10', '-ge', '10')).toBe(0)
  })

  it('evaluates representable file predicates', async () => {
    const { process } = createProcess()

    expect(await test(process, 'test', '-e', '/file')).toBe(0)
    expect(await test(process, 'test', '-f', '/file')).toBe(0)
    expect(await test(process, 'test', '-d', '/dir')).toBe(0)
    expect(await test(process, 'test', '-s', '/file')).toBe(0)
    expect(await test(process, 'test', '-s', '/empty')).toBe(1)
    expect(await test(process, 'test', '-x', '/executable')).toBe(0)
    expect(await test(process, 'test', '-e', '/missing')).toBe(1)
  })

  it('supports negation, grouping, and short-circuiting logical operators', async () => {
    const { process } = createProcess()

    expect(await test(
      process,
      'test',
      '!', '(', 'left', '=', 'right', '-o', '4', '-gt', '2', ')',
    )).toBe(1)
    expect(await test(
      process,
      'test',
      '', '-a', 'not-an-integer', '-eq', '1',
    )).toBe(1)
  })

  it('requires the closing bracket and returns 2 for malformed expressions', async () => {
    const { error, process } = createProcess()

    expect(await bracket(process, '[', 'value', ']')).toBe(0)
    expect(await bracket(process, '[', 'value')).toBe(2)
    expect(await test(process, 'test', 'nope', '-eq', '1')).toBe(2)
    expect(await test(process, 'test', 'one', 'two')).toBe(2)

    expect(error.content).toContain('Missing \']\'')
    expect(error.content).toContain('nope: integer expression expected')
    expect(error.content).toContain('Unexpected operand: two')
  })
})
