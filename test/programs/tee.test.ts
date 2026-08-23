import { describe, expect, it } from 'vitest'
import { tee } from '@/programs/tee'
import { Context } from '@/sys0/context'
import { Fs, FWrite } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import { createPipe } from '@/sys0/pipe'
import { Process } from '@/sys0/proc'
import { normalExit, signalExit } from '@/sys0/process_exit'
import { ProcessTable } from '@/sys0/process_table'
import { Stdio } from '@/sys0/stdio'

class MemoryOutput implements FWrite {
  content = ''
  write(data: string) { this.content += data }
  writeLn(data: string) { this.write(data + '\n') }
}

const createRoot = () => {
  const input = createPipe()
  const output = new MemoryOutput()
  const fs = new Fs(Vfs.dir({}), { persistence: new MemoryFsPersistence() })
  const context = {
    fs,
    processes: new ProcessTable(),
  } as Context
  const root = new Process(context, null, {
    name: 'init',
    env: { HOME: '/', PATH: '/bin', PWD: '/' },
    stdio: new Stdio(input.reader, output),
  })
  return { fs, input, output, root }
}

describe('tee', () => {
  it('copies its input to stdout and files', async () => {
    const { fs, input, output, root } = createRoot()
    input.writer.write('hello\n')
    input.writer.close()

    const exitStatus = await root.spawn(tee, { name: 'tee' }, '/copy.txt')

    expect(exitStatus).toEqual(normalExit(0))
    expect(output.content).toBe('hello\n')
    expect(fs.openU('/copy.txt', 'r').handle.read()).toBe('hello\n')
  })

  it('appends when requested', async () => {
    const { fs, input, root } = createRoot()
    fs.openU('/copy.txt', 'w').handle.write('before\n')
    input.writer.write('after\n')
    input.writer.close()

    await root.spawn(tee, { name: 'tee' }, '--append', '/copy.txt')

    expect(fs.openU('/copy.txt', 'r').handle.read()).toBe('before\nafter\n')
  })

  it('exits with the received signal while blocked on input', async () => {
    const { root } = createRoot()
    const running = root.spawn(tee, { name: 'tee' })

    root.signalForeground('SIGTERM')

    await expect(running).resolves.toEqual(signalExit('SIGTERM'))
  })
})
