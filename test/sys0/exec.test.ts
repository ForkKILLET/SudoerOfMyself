import { describe, expect, it } from 'vitest'
import { ExecErrorT, ExecService, NativeProgramRegistry } from '@/sys0/exec'
import { FOp, Fs } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import { FsSession } from '@/sys0/fs/session'
import { createProcessCredentials, HUMAN_USER_ID, HUMAN_GROUP_ID, ROOT_GROUP_ID } from '@/sys0/identity'

const installedProgram = () => 0

const createExec = () => {
  const fs = new Fs(Vfs.dir({
    bin: Vfs.dir({
      installed: Vfs.sysExe('installed'),
      unavailable: Vfs.sysExe('unavailable'),
      plain: Vfs.normal('not executable'),
      unmarked: Vfs.normal('#!sys\ninstalled\n'),
      malformed: Vfs.normal('#!sys\ninstalled\nextra\n', { mode: 0o755 }),
      private: Vfs.sysExe('installed', { mode: 0o700 }),
    }),
  }), { persistence: new MemoryFsPersistence() })
  const registry: NativeProgramRegistry = {
    installed: installedProgram,
    uninstalled: () => 0,
  }
  const session = new FsSession(
    fs,
    () => '/',
    () => createProcessCredentials(0, 0),
    () => 0o022,
  )
  return { fs, session, exec: new ExecService(registry) }
}

describe('ExecService', () => {
  it('lets ordinary users resolve and discover native programs without reading their contents', () => {
    const { fs, exec } = createExec()
    const session = new FsSession(fs, () => '/', () => createProcessCredentials(HUMAN_USER_ID, HUMAN_GROUP_ID), () => 0o022)

    const opened = session.open('/bin/installed', 'r')
    expect(opened.isErr && opened.err.type).toBe(FOp.T.PERMISSION_DENIED)
    const resolved = exec.resolve('installed', { envPath: '/bin', cwd: '/', fs: session }).unwrap()
    expect(resolved.program).toBe(installedProgram)
    expect(resolved.path).toBe('/bin/installed')
    expect(exec.listInPath('/bin', '/', session)).toEqual(['installed', 'unavailable'])
    expect(session.statU('/bin/installed')).toMatchObject({ mode: 0o751, size: 16 })
  })

  it('keeps native program contents readable to root and members of the owning group', () => {
    const { fs, session: root } = createExec()
    const groupMember = new FsSession(fs, () => '/', () => createProcessCredentials(
      HUMAN_USER_ID, HUMAN_GROUP_ID, [ROOT_GROUP_ID],
    ), () => 0o022)

    expect(root.openU('/bin/installed', 'r').handle.read()).toBe('#!sys\ninstalled\n')
    expect(groupMember.openU('/bin/installed', 'r').handle.read()).toBe('#!sys\ninstalled\n')
  })

  it('resolves an installed native program through PATH', () => {
    const { fs, session, exec } = createExec()

    const result = exec.resolve('installed', { envPath: '/bin', cwd: '/', fs: session })

    expect(result.isOk && result.val.program).toBe(installedProgram)
    expect(result.isOk && result.val.path).toBe('/bin/installed')
    expect(fs.openU('/bin/installed', 'r').handle.read()).toBe('#!sys\ninstalled\n')
  })

  it('distinguishes unavailable code from an uninstalled command', () => {
    const { exec, session } = createExec()

    const unavailable = exec.resolve('unavailable', { envPath: '/bin', cwd: '/', fs: session })
    const uninstalled = exec.resolve('uninstalled', { envPath: '/bin', cwd: '/', fs: session })

    expect(unavailable.isErr && unavailable.err).toEqual({
      type: ExecErrorT.NATIVE_PROGRAM_NOT_REGISTERED,
      programId: 'unavailable',
    })
    expect(uninstalled.isErr && uninstalled.err.type).toBe(ExecErrorT.NOT_FOUND)
  })

  it('rejects a regular non-executable file', () => {
    const { exec, session } = createExec()

    const result = exec.resolve('/bin/plain', { envPath: '/bin', cwd: '/', fs: session })

    expect(result.isErr && result.err.type).toBe(ExecErrorT.NOT_EXECUTABLE)
    expect(exec.resolve('/bin/unmarked', { envPath: '/bin', cwd: '/', fs: session }).isErr).toBe(true)
    expect(exec.resolve('/bin/malformed', { envPath: '/bin', cwd: '/', fs: session }).isErr).toBe(true)
  })

  it('uses the calling process permissions when resolving an executable', () => {
    const { fs, exec } = createExec()
    const session = new FsSession(
      fs,
      () => '/',
      () => createProcessCredentials(1000, 1000),
      () => 0o022,
    )

    const result = exec.resolve('/bin/private', { envPath: '/bin', cwd: '/', fs: session })

    expect(result.isErr && result.err.type).toBe(ExecErrorT.NOT_EXECUTABLE)
  })

  it('continues through PATH after a non-executable file', () => {
    const fs = new Fs(Vfs.dir({
      first: Vfs.dir({ tool: Vfs.normal('shadow') }),
      second: Vfs.dir({ tool: Vfs.sysExe('tool') }),
    }), { persistence: new MemoryFsPersistence() })
    const program = () => 0
    const exec = new ExecService({ tool: program })
    const session = new FsSession(
      fs,
      () => '/',
      () => createProcessCredentials(0, 0),
      () => 0o022,
    )

    const result = exec.resolve('tool', { envPath: '/first:/second', cwd: '/', fs: session })

    expect(result.isOk && result.val.path).toBe('/second/tool')
    expect(result.isOk && result.val.program).toBe(program)
  })

  it('lists installed files rather than every registered program', () => {
    const { fs, session, exec } = createExec()

    expect(exec.listInPath('/bin', '/', session)).toEqual(['installed', 'unavailable', 'private'])

    fs.rmU('/bin/installed')
    expect(exec.listInPath('/bin', '/', session)).toEqual(['unavailable', 'private'])
  })
})
