import { describe, expect, it } from 'vitest'
import { mkdir } from '@/programs/mkdir'
import { rm } from '@/programs/rm'
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
  const error = new MemoryOutput()
  const fs = new Fs(Vfs.dir({
    existing: Vfs.dir(),
    file: Vfs.normal('contents'),
    nested: Vfs.dir({ child: Vfs.normal('data') }),
  }), { persistence: new MemoryFsPersistence() })
  const context = { fs, processes: new ProcessTable() } as Context
  const process = new Process(context, null, {
    name: 'hsh',
    cwd: '/',
    env: { HOME: '/', PATH: '/bin', PWD: '/' },
    stdio: new Stdio(new EmptyInput(), output, error),
  })
  return { error, fs, output, process }
}

describe('file-management commands', () => {
  it('mkdir -p creates missing parents and accepts existing directories', async () => {
    const { fs, process } = createProcess()

    await expect(mkdir(process, 'mkdir', '-p', '/one/two/three')).resolves.toBe(0)
    await expect(mkdir(process, 'mkdir', '-p', '/one/two')).resolves.toBe(0)

    expect(fs.find('/one/two/three').isOk).toBe(true)
  })

  it('mkdir without -p still rejects a missing parent', async () => {
    const { error, fs, process } = createProcess()

    await expect(mkdir(process, 'mkdir', '/missing/child')).resolves.toBe(1)

    expect(fs.find('/missing').isErr).toBe(true)
    expect(error.content).toContain('No such file or directory')
  })

  it('rm -f ignores missing operands while rm requires an operand', async () => {
    const forced = createProcess()
    await expect(rm(forced.process, 'rm', '-f', '/missing')).resolves.toBe(0)
    expect(forced.error.content).toBe('')

    const empty = createProcess()
    await expect(rm(empty.process, 'rm')).resolves.toBe(1)
    expect(empty.error.content).toContain('Missing operand')
  })

  it('rm processes later operands after an error and reports failure', async () => {
    const { error, fs, process } = createProcess()

    await expect(rm(process, 'rm', '/missing', '/file')).resolves.toBe(1)

    expect(error.content).toContain('Cannot remove \'/missing\': No such file or directory')
    expect(fs.find('/file').isErr).toBe(true)
  })

  it('rm -r removes a populated directory', async () => {
    const { fs, process } = createProcess()

    await expect(rm(process, 'rm', '-r', '/nested')).resolves.toBe(0)

    expect(fs.find('/nested').isErr).toBe(true)
  })
})
