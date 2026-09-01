import { Err, Ok } from 'fk-result'
import type { FOp, FRead, FReadWrite, FWrite } from '@/sys0/fs'
import type { Process } from '@/sys0/proc'
import { SyscallDefinition, SyscallHandlers, SyncSyscallClient } from './ipc'
import {
  type FdError,
  readableFileTarget,
  readWriteFileTarget,
  writableFileTarget,
} from '@/sys0/fd'
import type { FileMode } from '@/sys0/fs/file_handle'

export type FdOpenError = FOp.Error | FdError

export type GameSyscallSchema = {
  'fd.open': SyscallDefinition<[path: string, mode: FileMode], number, FdOpenError>
  'fd.readKey': SyscallDefinition<[fd: number], string, FdError>
  'fd.read': SyscallDefinition<[fd: number], string, FdError>
  'fd.write': SyscallDefinition<[fd: number, data: string], void, FdError>
  'fd.close': SyscallDefinition<[fd: number], void, FdError>
  'fd.dup': SyscallDefinition<[fd: number, newFd: number | null], number, FdError>
  'stdio.readKey': SyscallDefinition<[], string, FdError>
  'stdio.write': SyscallDefinition<[data: string], void, FdError>
  'fs.readFile': SyscallDefinition<[path: string], string, FOp.Error>
  'fs.writeFile': SyscallDefinition<[path: string, data: string, mode: 'write' | 'append'], void, FOp.Error>
  'env.get': SyscallDefinition<[name: string], string, never>
  'cwd.get': SyscallDefinition<[], string, never>
}

export const createGameSyscallHandlers = (
  process: Process,
  signal: AbortSignal,
): SyscallHandlers<GameSyscallSchema> => {
  const readKey = async (fd: number) => {
    const readable = process.stdio.fds.getReadable(fd)
    if (readable.isErr) return readable
    return Ok(await readable.val.readKey({ signal }))
  }
  const write = (fd: number, data: string) => {
    const writable = process.stdio.fds.getWritable(fd)
    if (writable.isErr) return writable
    writable.val.write(data)
    return Ok(undefined)
  }

  return {
    'fd.open': (path, mode) => {
      const opened = process.ctx.fs.open(path, mode, process.cwd)
      if (opened.isErr) return Err(opened.err)
      const handle = opened.val.handle
      const target = mode === 'r'
        ? readableFileTarget(handle as FRead)
        : mode === 'w' || mode === 'a'
          ? writableFileTarget(handle as FWrite)
          : readWriteFileTarget(handle as FReadWrite)
      return process.stdio.fds.open(target)
    },
    'fd.readKey': readKey,
    'fd.read': async (fd) => {
      const readable = process.stdio.fds.getReadable(fd)
      if (readable.isErr) return readable
      return Ok(await readable.val.read({ signal }))
    },
    'fd.write': write,
    'fd.close': fd => process.stdio.fds.close(fd),
    'fd.dup': (fd, newFd) => process.stdio.fds.duplicate(fd, newFd ?? undefined),
    'stdio.readKey': () => readKey(0),
    'stdio.write': data => write(1, data),
    'fs.readFile': (path) => {
      const opened = process.ctx.fs.open(path, 'r', process.cwd)
      if (opened.isErr) return Err(opened.err)
      return Ok(opened.val.handle.read())
    },
    'fs.writeFile': (path, data, mode) => {
      const fileMode = mode === 'append' ? 'a' as const : 'w' as const
      const opened = process.ctx.fs.open(path, fileMode, process.cwd)
      if (opened.isErr) return Err(opened.err)
      opened.val.handle.write(data)
      return Ok(undefined)
    },
    'env.get': name => Ok(process.env[name] ?? ''),
    'cwd.get': () => Ok(process.cwd),
  }
}

export class WorkerProcessApi {
  constructor(private readonly client: SyncSyscallClient<GameSyscallSchema>) {}

  readKey() {
    return this.readKeyFd(0)
  }

  write(data: string) {
    return this.writeFd(1, data)
  }

  writeLn(data: string) {
    return this.write(data + '\n')
  }

  writeError(data: string) {
    return this.writeFd(2, data)
  }

  writeErrorLn(data: string) {
    return this.writeError(data + '\n')
  }

  open(path: string, mode: FileMode) {
    return this.client.call('fd.open', path, mode)
  }

  readKeyFd(fd: number) {
    return this.client.call('fd.readKey', fd)
  }

  readFd(fd: number) {
    return this.client.call('fd.read', fd)
  }

  writeFd(fd: number, data: string) {
    return this.client.call('fd.write', fd, data)
  }

  close(fd: number) {
    return this.client.call('fd.close', fd)
  }

  dup(fd: number, newFd: number | null = null) {
    return this.client.call('fd.dup', fd, newFd)
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
