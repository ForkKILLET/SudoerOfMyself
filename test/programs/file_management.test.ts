import { describe, expect, it } from 'vitest'
import { cp } from '@/programs/cp'
import { mkdir } from '@/programs/mkdir'
import { mv } from '@/programs/mv'
import { rm } from '@/programs/rm'
import { rmdir } from '@/programs/rmdir'
import { stat } from '@/programs/stat'
import { touch } from '@/programs/touch'
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
    executable: Vfs.nativeExe('command'),
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

  it('stat displays supported metadata and continues after missing files', async () => {
    const { error, output, process } = createProcess()

    await expect(stat(process, 'stat', '/file', '/missing')).resolves.toBe(1)

    expect(output.content).toContain('File: /file')
    expect(output.content).toContain('Size: 8')
    expect(output.content).toContain('Type: normal file')
    expect(error.content).toContain('Cannot stat \'/missing\'')
  })

  it('touch creates files, preserves content, and supports --no-create', async () => {
    const { fs, process } = createProcess()

    await expect(touch(process, 'touch', '/created', '/file')).resolves.toBe(0)
    await expect(touch(process, 'touch', '-c', '/skipped')).resolves.toBe(0)

    expect(fs.openU('/created', 'r').handle.read()).toBe('')
    expect(fs.openU('/file', 'r').handle.read()).toBe('contents')
    expect(fs.find('/skipped').isErr).toBe(true)
  })

  it('cp copies files and executable descriptors', async () => {
    const { fs, process } = createProcess()

    await expect(cp(process, 'cp', '/file', '/copy')).resolves.toBe(0)
    await expect(cp(process, 'cp', '/executable', '/command-copy')).resolves.toBe(0)

    expect(fs.openU('/copy', 'r').handle.read()).toBe('contents')
    expect(fs.findInodeU('/command-copy').inode.executable).toEqual({
      format: 'native',
      programId: 'command',
    })
  })

  it('cp requires -r for directories and recursively copies their contents', async () => {
    const rejected = createProcess()
    await expect(cp(rejected.process, 'cp', '/nested', '/copy')).resolves.toBe(1)
    expect(rejected.fs.find('/copy').isErr).toBe(true)

    const recursive = createProcess()
    await expect(cp(recursive.process, 'cp', '-r', '/nested', '/copy')).resolves.toBe(0)
    expect(recursive.fs.openU('/copy/child', 'r').handle.read()).toBe('data')
  })

  it('mv moves operands into a target directory without changing inode identity', async () => {
    const { fs, process } = createProcess()
    const iid = fs.findInodeU('/file').inode.iid

    await expect(mv(process, 'mv', '/file', '/existing')).resolves.toBe(0)

    expect(fs.find('/file').isErr).toBe(true)
    expect(fs.findInodeU('/existing/file').inode.iid).toBe(iid)
  })

  it('rmdir removes empty directories and optionally their parents', async () => {
    const { fs, process } = createProcess()
    fs.mkdirU('/one/two', { parents: true })

    await expect(rmdir(process, 'rmdir', '-p', '/one/two')).resolves.toBe(0)
    await expect(rmdir(process, 'rmdir', '/nested')).resolves.toBe(1)

    expect(fs.find('/one').isErr).toBe(true)
    expect(fs.find('/nested').isOk).toBe(true)
  })

  it('rmdir refuses to remove the file-system root', async () => {
    const { error, process } = createProcess()

    await expect(rmdir(process, 'rmdir', '/')).resolves.toBe(1)

    expect(error.content).toContain('Is root directory')
  })
})
