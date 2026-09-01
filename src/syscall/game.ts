import { Err, Ok } from 'fk-result'
import type { FOp } from '@/sys0/fs'
import type { Process } from '@/sys0/proc'
import { SyscallDefinition, SyscallHandlers, SyncSyscallClient } from './ipc'

export type GameSyscallSchema = {
  'stdio.readKey': SyscallDefinition<[], string, never>
  'stdio.write': SyscallDefinition<[data: string], void, never>
  'fs.readFile': SyscallDefinition<[path: string], string, FOp.Error>
  'fs.writeFile': SyscallDefinition<[path: string, data: string, mode: 'write' | 'append'], void, FOp.Error>
  'env.get': SyscallDefinition<[name: string], string, never>
  'cwd.get': SyscallDefinition<[], string, never>
}

export const createGameSyscallHandlers = (
  process: Process,
  signal: AbortSignal,
): SyscallHandlers<GameSyscallSchema> => ({
  'stdio.readKey': async () => Ok(await process.stdio.readKey({ signal })),
  'stdio.write': (data) => {
    process.stdio.write(data)
    return Ok(undefined)
  },
  'fs.readFile': (path) => {
    const opened = process.ctx.fs.open(path, 'r')
    if (opened.isErr) return Err(opened.err)
    return Ok(opened.val.handle.read())
  },
  'fs.writeFile': (path, data, mode) => {
    const fileMode = mode === 'append' ? 'a' as const : 'w' as const
    const opened = process.ctx.fs.open(path, fileMode)
    if (opened.isErr) return Err(opened.err)
    opened.val.handle.write(data)
    return Ok(undefined)
  },
  'env.get': name => Ok(process.env[name] ?? ''),
  'cwd.get': () => Ok(process.cwd),
})

export class WorkerProcessApi {
  constructor(
    private readonly client: SyncSyscallClient<GameSyscallSchema>,
    private readonly onCpuTime?: (totalMs: number) => void,
  ) {}

  reportCpuTime(totalMs: number) {
    this.onCpuTime?.(totalMs)
  }

  readKey() {
    return this.client.call('stdio.readKey')
  }

  write(data: string) {
    return this.client.call('stdio.write', data)
  }

  writeLn(data: string) {
    return this.write(data + '\n')
  }

  readFile(path: string) {
    return this.client.call('fs.readFile', path)
  }

  writeFile(path: string, data: string, mode: 'write' | 'append' = 'write') {
    return this.client.call('fs.writeFile', path, data, mode)
  }

  getEnv(name: string) {
    return this.client.call('env.get', name)
  }

  getCwd() {
    return this.client.call('cwd.get')
  }
}
