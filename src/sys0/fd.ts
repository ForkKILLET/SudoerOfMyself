import { Err, Ok, Result } from 'fk-result'
import type { FRead, FWrite } from './fs'

export type Fd = number

export type FdError =
  | { type: 'bad-file-descriptor', fd: Fd }
  | { type: 'not-readable', fd: Fd }
  | { type: 'not-writable', fd: Fd }
  | { type: 'too-many-open-files' }

export const displayFdError = (error: FdError) => {
  switch (error.type) {
    case 'bad-file-descriptor':
      return `Bad file descriptor: ${error.fd}`
    case 'not-readable':
      return `File descriptor ${error.fd} is not readable`
    case 'not-writable':
      return `File descriptor ${error.fd} is not writable`
    case 'too-many-open-files':
      return 'Too many open files'
  }
}

export interface OpenFileTarget {
  readable?: FRead
  writable?: FWrite
  close?: () => void
}

const closeOf = (stream: object) => {
  const close = (stream as { close?: unknown }).close
  return typeof close === 'function'
    ? () => close.call(stream)
    : undefined
}

export const readableFileTarget = (readable: FRead): OpenFileTarget => ({
  readable,
  close: closeOf(readable),
})

export const writableFileTarget = (writable: FWrite): OpenFileTarget => ({
  writable,
  close: closeOf(writable),
})

export class OpenFileDescription {
  private referenceCount = 0
  private closed = false

  constructor(readonly target: OpenFileTarget) {}

  get references() {
    return this.referenceCount
  }

  get isClosed() {
    return this.closed
  }

  retain() {
    if (this.closed) throw new Error('Cannot retain a closed open-file description')
    this.referenceCount ++
  }

  release() {
    if (this.referenceCount <= 0) {
      throw new Error('Cannot release an unreferenced open-file description')
    }
    this.referenceCount --
    if (this.referenceCount) return
    this.closed = true
    this.target.close?.()
  }
}

export interface DescriptorEntry {
  description: OpenFileDescription
  closeOnExec: boolean
}

export const MAX_OPEN_FILE_DESCRIPTORS = 1024

const isFd = (fd: number) => Number.isSafeInteger(fd) && fd >= 0 && fd < MAX_OPEN_FILE_DESCRIPTORS

export class FdTable {
  private readonly entries = new Map<Fd, DescriptorEntry>()
  private closed = false

  get size() {
    return this.entries.size
  }

  has(fd: Fd) {
    return this.entries.has(fd)
  }

  get(fd: Fd): Result<DescriptorEntry, FdError> {
    const entry = isFd(fd) ? this.entries.get(fd) : undefined
    return entry ? Ok(entry) : Err({ type: 'bad-file-descriptor', fd })
  }

  getReadable(fd: Fd): Result<FRead, FdError> {
    const entry = this.get(fd)
    if (entry.isErr) return entry
    return entry.val.description.target.readable
      ? Ok(entry.val.description.target.readable)
      : Err({ type: 'not-readable', fd })
  }

  getWritable(fd: Fd): Result<FWrite, FdError> {
    const entry = this.get(fd)
    if (entry.isErr) return entry
    return entry.val.description.target.writable
      ? Ok(entry.val.description.target.writable)
      : Err({ type: 'not-writable', fd })
  }

  open(target: OpenFileTarget, minimumFd = 0): Result<Fd, FdError> {
    const description = new OpenFileDescription(target)
    const fd = this.nextAvailable(minimumFd)
    if (fd === null) {
      target.close?.()
      return Err({ type: 'too-many-open-files' })
    }
    this.set(fd, description)
    return Ok(fd)
  }

  set(
    fd: Fd,
    description: OpenFileDescription,
    { closeOnExec = false }: { closeOnExec?: boolean } = {},
  ): Result<void, FdError> {
    if (this.closed || ! isFd(fd)) return Err({ type: 'bad-file-descriptor', fd })
    const previous = this.entries.get(fd)
    if (previous?.description === description) {
      previous.closeOnExec = closeOnExec
      return Ok(undefined)
    }

    description.retain()
    this.entries.set(fd, { description, closeOnExec })
    previous?.description.release()
    return Ok(undefined)
  }

  replace(fd: Fd, target: OpenFileTarget): Result<void, FdError> {
    const installed = this.set(fd, new OpenFileDescription(target))
    if (installed.isErr) target.close?.()
    return installed
  }

  duplicate(oldFd: Fd, newFd?: Fd): Result<Fd, FdError> {
    const source = this.get(oldFd)
    if (source.isErr) return source
    const targetFd = newFd ?? this.nextAvailable(0)
    if (targetFd === null) return Err({ type: 'too-many-open-files' })
    if (! isFd(targetFd)) return Err({ type: 'bad-file-descriptor', fd: targetFd })
    if (oldFd === targetFd) return Ok(targetFd)
    const installed = this.set(targetFd, source.val.description)
    return installed.isErr ? installed : Ok(targetFd)
  }

  close(fd: Fd): Result<void, FdError> {
    const entry = this.get(fd)
    if (entry.isErr) return entry
    this.entries.delete(fd)
    entry.val.description.release()
    return Ok(undefined)
  }

  closeIfOpen(fd: Fd): Result<void, FdError> {
    if (! isFd(fd)) return Err({ type: 'bad-file-descriptor', fd })
    return this.entries.has(fd) ? this.close(fd) : Ok(undefined)
  }

  fork() {
    const forked = new FdTable()
    this.entries.forEach(({ description, closeOnExec }, fd) => {
      forked.set(fd, description, { closeOnExec }).unwrap()
    })
    return forked
  }

  closeAll() {
    if (this.closed) return
    this.closed = true
    const entries = [...this.entries.values()]
    this.entries.clear()
    entries.forEach(({ description }) => description.release())
  }

  private nextAvailable(minimumFd: Fd) {
    if (! isFd(minimumFd)) return null
    for (let fd = minimumFd; fd < MAX_OPEN_FILE_DESCRIPTORS; fd ++) {
      if (! this.entries.has(fd)) return fd
    }
    return null
  }
}
