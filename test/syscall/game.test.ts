import { describe, expect, it } from 'vitest'
import { createGameSyscallHandlers } from '@/syscall/game'
import { Context } from '@/sys0/context'
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
  const fs = new Fs(Vfs.dir({
    home: Vfs.dir({
      input: Vfs.normal('input data'),
    }),
  }), { persistence: new MemoryFsPersistence() })
  const context = {
    fs,
    processes: new ProcessTable(),
  } as Context
  const process = new Process(context, null, {
    name: 'worker',
    cwd: '/home',
    stdio: new Stdio(new EmptyInput(), output),
  })
  const handlers = createGameSyscallHandlers(process, new AbortController().signal)
  return { fs, handlers, output, process }
}

describe('game file-descriptor syscalls', () => {
  it('opens relative paths and shares the open-file description through dup', async () => {
    const { fs, handlers } = createProcess()
    const opened = await handlers['fd.open']('output', 'w')
    expect(opened.isOk && opened.val).toBe(3)
    if (opened.isErr) return

    const duplicated = await handlers['fd.dup'](opened.val, 7)
    expect(duplicated.isOk && duplicated.val).toBe(7)
    await handlers['fd.write'](opened.val, 'first')
    await handlers['fd.write'](7, ' second')
    await handlers['fd.close'](opened.val)
    await handlers['fd.close'](7)

    expect(fs.openU('/home/output', 'r').handle.read()).toBe('first second')
  })

  it('reads through an integer descriptor and returns explicit descriptor errors', async () => {
    const { handlers } = createProcess()
    const opened = await handlers['fd.open']('input', 'r')
    if (opened.isErr) throw new Error('Could not open test input')

    const read = await handlers['fd.read'](opened.val)
    expect(read.isOk && read.val).toBe('input data')
    const invalid = await handlers['fd.write'](99, 'nope')
    expect(invalid.isErr && invalid.err).toEqual({ type: 'bad-file-descriptor', fd: 99 })
  })

  it('routes the stdio compatibility calls through descriptors 0 and 1', async () => {
    const { handlers, output, process } = createProcess()
    process.stdio.fds.close(1).unwrap()
    const replacement = new MemoryOutput()
    process.stdio.output = replacement

    const written = await handlers['stdio.write']('redirected')

    expect(written.isOk).toBe(true)
    expect(output.content).toBe('')
    expect(replacement.content).toBe('redirected')
  })
})
