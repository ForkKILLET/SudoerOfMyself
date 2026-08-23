import { describe, expect, it } from 'vitest'
import { createHsh } from '@/programs/hsh'
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

class NullOutput implements FWrite {
  write() {}
  writeLn() {}
}

const createShell = () => {
  const context = {
    fs: new Fs(Vfs.dir({ home: Vfs.dir() }), { persistence: new MemoryFsPersistence() }),
    processes: new ProcessTable(),
  } as Context
  return new Process(context, null, {
    name: 'hsh',
    env: { HOME: '/home', PATH: '/bin', PWD: '/home' },
    stdio: new Stdio(new EmptyInput(), new NullOutput()),
  })
}

describe('hsh special parameters', () => {
  it('initializes PID and positional parameters for command mode', async () => {
    const shell = createShell()
    let captured: Record<string, string> = {}
    const hsh = createHsh({
      builtins: {
        capture: (process) => {
          captured = { ...process.env }
          return 0
        },
      },
    })

    await hsh(shell, 'hsh', '-c', 'capture', 'custom-zero', 'first', 'second')

    expect(captured['$']).toBe(shell.pid.toString())
    expect(captured['0']).toBe('custom-zero')
    expect(captured['1']).toBe('first')
    expect(captured['2']).toBe('second')
    expect(captured['3']).toBeUndefined()
    expect(captured['#']).toBe('2')
    expect(captured['*']).toBe('first second')
    expect(captured['@']).toBe('first second')
    expect(captured['?']).toBe('0')
    expect(captured['!']).toBe('')
  })

  it('updates status and last-argument parameters between commands', async () => {
    const shell = createShell()
    let captured: Record<string, string> = {}
    const hsh = createHsh({
      builtins: {
        remember: () => 7,
        capture: (process) => {
          captured = { ...process.env }
          return 0
        },
      },
    })

    await hsh(shell, 'hsh', '-c', 'remember first last\ncapture')

    expect(captured['?']).toBe('7')
    expect(captured['_']).toBe('last')
  })
})
