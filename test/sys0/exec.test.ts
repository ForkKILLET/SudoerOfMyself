import { describe, expect, it } from 'vitest'
import { ExecErrorT, ExecService, NativeProgramRegistry } from '@/sys0/exec'
import { Fs } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'

const installedProgram = () => 0

const createExec = () => {
  const fs = new Fs(Vfs.dir({
    bin: Vfs.dir({
      installed: Vfs.nativeExe('installed'),
      unavailable: Vfs.nativeExe('unavailable'),
      plain: Vfs.normal('not executable'),
    }),
  }), { persistence: new MemoryFsPersistence() })
  const registry: NativeProgramRegistry = {
    installed: installedProgram,
    uninstalled: () => 0,
  }
  return { fs, exec: new ExecService(fs, registry) }
}

describe('ExecService', () => {
  it('resolves an installed native program through PATH', () => {
    const { fs, exec } = createExec()

    const result = exec.resolve('installed', { envPath: '/bin', cwd: '/' })

    expect(result.isOk && result.val.program).toBe(installedProgram)
    expect(result.isOk && result.val.path).toBe('/bin/installed')
    expect(fs.openU('/bin/installed', 'r').handle.read()).toBe('')
  })

  it('distinguishes unavailable code from an uninstalled command', () => {
    const { exec } = createExec()

    const unavailable = exec.resolve('unavailable', { envPath: '/bin', cwd: '/' })
    const uninstalled = exec.resolve('uninstalled', { envPath: '/bin', cwd: '/' })

    expect(unavailable.isErr && unavailable.err).toEqual({
      type: ExecErrorT.NATIVE_PROGRAM_NOT_REGISTERED,
      programId: 'unavailable',
    })
    expect(uninstalled.isErr && uninstalled.err.type).toBe(ExecErrorT.NOT_FOUND)
  })

  it('rejects a regular non-executable file', () => {
    const { exec } = createExec()

    const result = exec.resolve('/bin/plain', { envPath: '/bin', cwd: '/' })

    expect(result.isErr && result.err.type).toBe(ExecErrorT.NOT_EXECUTABLE)
  })

  it('continues through PATH after a non-executable file', () => {
    const fs = new Fs(Vfs.dir({
      first: Vfs.dir({ tool: Vfs.normal('shadow') }),
      second: Vfs.dir({ tool: Vfs.nativeExe('tool') }),
    }), { persistence: new MemoryFsPersistence() })
    const program = () => 0
    const exec = new ExecService(fs, { tool: program })

    const result = exec.resolve('tool', { envPath: '/first:/second', cwd: '/' })

    expect(result.isOk && result.val.path).toBe('/second/tool')
    expect(result.isOk && result.val.program).toBe(program)
  })

  it('lists installed files rather than every registered program', () => {
    const { fs, exec } = createExec()

    expect(exec.listInPath('/bin', '/')).toEqual(['installed', 'unavailable'])

    fs.rmU('/bin/installed')
    expect(exec.listInPath('/bin', '/')).toEqual(['unavailable'])
  })
})
