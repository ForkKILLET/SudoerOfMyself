import { describe, expect, it } from 'vitest'
import { chmod } from '@/programs/chmod'
import { chown } from '@/programs/chown'
import { groups } from '@/programs/groups'
import { id } from '@/programs/id'
import { umask } from '@/programs/umask'
import { whoami } from '@/programs/whoami'
import { Context } from '@/sys0/context'
import { ExecService } from '@/sys0/exec'
import { FRead, Fs, FWrite } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { Vfs } from '@/sys0/fs/vfs'
import { AccountService, HUMAN_USER_ID, ROOT_USER_ID } from '@/sys0/identity'
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

const createProcess = (uid = HUMAN_USER_ID) => {
  const output = new MemoryOutput()
  const error = new MemoryOutput()
  const accounts = new AccountService()
  const fs = new Fs(Vfs.dir({
    home: Vfs.dir({
      script: Vfs.normal('#!sys\nscript\n', {
        uid: HUMAN_USER_ID,
        gid: HUMAN_USER_ID,
        mode: 0o644,
      }),
    }, { uid: HUMAN_USER_ID, gid: HUMAN_USER_ID, mode: 0o700 }),
    root: Vfs.dir({ secret: Vfs.normal('secret') }, { mode: 0o700 }),
  }), { persistence: new MemoryFsPersistence() })
  const exec = new ExecService({ script: () => 0 })
  const context = { accounts, exec, fs, processes: new ProcessTable() } as Context
  const process = new Process(context, null, {
    name: 'hsh',
    cwd: uid === ROOT_USER_ID ? '/root' : '/home',
    credentials: accounts.createCredentials(uid),
    env: { HOME: '/home', PATH: '/home', PWD: '/home' },
    stdio: new Stdio(new EmptyInput(), output, error),
  })
  return { error, exec, fs, output, process }
}

describe('identity and permission commands', () => {
  it('reports the current identity and memberships', async () => {
    const { output, process } = createProcess()

    await expect(whoami(process, 'whoami')).resolves.toBe(0)
    await expect(id(process, 'id')).resolves.toBe(0)
    await expect(groups(process, 'groups')).resolves.toBe(0)

    expect(output.content).toContain('human\n')
    expect(output.content).toContain('uid=1000(human) gid=1000(human) groups=1000(human)')
  })

  it('changes modes and makes a valid sys file executable', async () => {
    const { exec, fs, process } = createProcess()

    await expect(chmod(process, 'chmod', '755', 'script')).resolves.toBe(0)

    expect(fs.statU('/home/script').mode).toBe(0o755)
    expect(exec.resolve('script', {
      envPath: process.env.PATH,
      cwd: process.cwd,
      fs: process.fs,
    }).isOk).toBe(true)
  })

  it('uses the process umask for subsequently created files', async () => {
    const { fs, output, process } = createProcess()

    await expect(umask(process, 'umask', '077')).resolves.toBe(0)
    expect(process.fs.touch('/home/private').isOk).toBe(true)
    await expect(umask(process, 'umask')).resolves.toBe(0)

    expect(fs.statU('/home/private').mode).toBe(0o600)
    expect(output.content).toBe('0077\n')
  })

  it('restricts ownership changes to root', async () => {
    const human = createProcess()
    await expect(chown(human.process, 'chown', 'root', '/home/script')).resolves.toBe(1)
    expect(human.error.content).toContain('Permission denied')

    const root = createProcess(ROOT_USER_ID)
    await expect(chown(root.process, 'chown', 'human:human', '/root/secret')).resolves.toBe(0)
    expect(root.fs.statU('/root/secret')).toMatchObject({ uid: 1000, gid: 1000 })
  })
})
