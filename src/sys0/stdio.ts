import { Term } from './term'
import { sleep } from '@/utils'
import { Emitter, Events } from '@/utils/emitter'
import { FRead, FReadKeyOptions, FReadWrite, FWrite } from './fs'
import { Pred } from '@/utils/types'
import {
  displayFdError,
  FdTable,
  OpenFileDescription,
  readableFileTarget,
  type OpenFileTarget,
  writableFileTarget,
} from './fd'

export interface StdinEvents extends Events {
  data: [ string ]
}

interface PendingStdinRead {
  finish(data: string): void
}

const splitTerminalData = (data: string) => {
  const chunks: string[] = []
  let chunkStart = 0

  for (let index = 0; index < data.length; index ++) {
    const char = data[index]
    if (char !== '\r' && char !== '\n') continue

    if (index > chunkStart) chunks.push(data.slice(chunkStart, index))
    chunks.push('\r')

    if (char === '\r' && data[index + 1] === '\n') index ++
    chunkStart = index + 1
  }

  if (chunkStart < data.length) chunks.push(data.slice(chunkStart))
  return chunks
}

export class Stdin extends Emitter<StdinEvents> implements FRead {
  isDisabled = false
  private readonly queuedData: string[] = []
  private readonly pendingReads: PendingStdinRead[] = []

  constructor(private term: Term) {
    super()

    this.term.on('data', (data) => {
      if (this.isDisabled) return
      splitTerminalData(data).forEach(chunk => this.enqueue(chunk))
    })
  }

  private enqueue(data: string) {
    const pendingRead = this.pendingReads.shift()
    if (pendingRead) pendingRead.finish(data)
    else this.queuedData.push(data)
    this.emit('data', data)
  }

  readKey({
    signal,
  }: FReadKeyOptions = {}) {
    if (signal?.aborted) return Promise.resolve('\x03')
    const queued = this.queuedData.shift()
    if (queued !== undefined) return Promise.resolve(queued)

    return new Promise<string>((resolve) => {
      const pendingRead: PendingStdinRead = {
        finish: (data) => {
          signal?.removeEventListener('abort', abort)
          resolve(data)
        },
      }
      const abort = () => {
        const index = this.pendingReads.indexOf(pendingRead)
        if (index === - 1) return
        this.pendingReads.splice(index, 1)
        pendingRead.finish('\x03')
      }

      this.pendingReads.push(pendingRead)
      signal?.addEventListener('abort', abort, { once: true })
    })
  }

  async* readChar(options?: FReadKeyOptions) {
    while (true) {
      const key = await this.readKey(options)
      if (! key) return '\0'
      yield* [...key].map(char => char === '\r' ? '\n' : char)
    }
  }

  async readUntil(pred: Pred<string>, options?: FReadKeyOptions) {
    let data = ''
    for await (const char of this.readChar(options)) {
      if (options?.signal?.aborted) break
      if (char === '\0' || char === '\x04' || pred(char)) break
      if (char === '\x7F') data = data.slice(0, - 1)
      else data += char
    }
    return data
  }

  async read(options?: FReadKeyOptions): Promise<string> {
    return this.readUntil(() => false, options)
  }

  async readLn(options?: FReadKeyOptions): Promise<string> {
    return this.readUntil(char => char === '\n', options)
  }
}

export interface StdoutEvents extends Events {
  'start-writing': []
  'stop-writing': []
}

export class Stdout extends Emitter<StdoutEvents> implements FWrite {
  isDisabled = false
  isWriting = false
  hasPartialLine = false

  constructor(private term: Term) {
    super()
  }

  private startWriting() {
    this.isWriting = true
    this.emit('start-writing')
  }

  private stopWriting() {
    this.isWriting = false
    this.emit('stop-writing')
  }

  write(data: string) {
    if (this.isDisabled || ! data) return
    this.startWriting()
    this.term.write(data.replaceAll('\n', '\r\n'))
    this.hasPartialLine = ! data.endsWith('\n')
    this.stopWriting()
  }

  writeLn(data: string) {
    this.write(data + '\n')
  }

  async type(data: string, interval: number) {
    if (this.isDisabled) return
    this.startWriting()
    for (const char of data) {
      this.term.write(char)
      await sleep(interval)
    }
    this.stopWriting()
  }
}

export class Stdio implements FReadWrite {
  isTied = true

  readonly fds: FdTable

  constructor(input: FRead | FdTable, output?: FWrite, error = output) {
    if (input instanceof FdTable) {
      this.fds = input
      return
    }
    if (! output || ! error) throw new Error('Stdio requires input, output, and error streams')

    this.fds = new FdTable()
    const descriptions = new Map<object, OpenFileDescription>()
    const descriptionFor = (stream: FRead | FWrite, target: OpenFileTarget) => {
      const existing = descriptions.get(stream)
      if (existing) {
        if (target.readable) existing.target.readable = target.readable
        if (target.writable) existing.target.writable = target.writable
        if (target.close) existing.target.close = target.close
        return existing
      }
      const description = new OpenFileDescription(target)
      descriptions.set(stream, description)
      return description
    }
    this.fds.set(0, descriptionFor(input, readableFileTarget(input))).unwrap()
    this.fds.set(1, descriptionFor(output, writableFileTarget(output))).unwrap()
    this.fds.set(2, descriptionFor(error, writableFileTarget(error))).unwrap()
  }

  get input() {
    return this.fds.getReadable(0).unwrapBy((error) => {
      throw new Error(displayFdError(error))
    })
  }

  set input(input: FRead) {
    this.fds.replace(0, readableFileTarget(input)).unwrap()
  }

  get output() {
    return this.fds.getWritable(1).unwrapBy((error) => {
      throw new Error(displayFdError(error))
    })
  }

  set output(output: FWrite) {
    this.fds.replace(1, writableFileTarget(output)).unwrap()
  }

  get error() {
    return this.fds.getWritable(2).unwrapBy((error) => {
      throw new Error(displayFdError(error))
    })
  }

  set error(error: FWrite) {
    this.fds.replace(2, writableFileTarget(error)).unwrap()
  }

  get stdin() {
    const input = this.fds.getReadable(0)
    return input.isOk && input.val instanceof Stdin ? input.val : undefined
  }

  get stdout() {
    const output = this.fds.getWritable(1)
    return output.isOk && output.val instanceof Stdout ? output.val : undefined
  }

  get stderr() {
    const error = this.fds.getWritable(2)
    return error.isOk && error.val instanceof Stdout ? error.val : undefined
  }

  fork() {
    return new Stdio(this.fds.fork())
  }

  close() {
    this.fds.closeAll()
  }

  static fromTerm(term: Term) {
    const input = new Stdin(term)
    const output = new Stdout(term)
    const stdio = new Stdio(input, output)

    output.on('start-writing', () => {
      if (stdio.isTied) input.isDisabled = true
    })

    output.on('stop-writing', () => {
      if (stdio.isTied) input.isDisabled = false
    })

    return stdio
  }

  readKey(options?: FReadKeyOptions) { return this.input.readKey(options) }
  read(options?: FReadKeyOptions) { return this.input.read(options) }
  readLn(options?: FReadKeyOptions) { return this.input.readLn(options) }
  readUntil(pred: Pred<string>, options?: FReadKeyOptions) { return this.input.readUntil(pred, options) }
  write(data: string) { this.output.write(data) }
  writeLn(data: string) { this.output.writeLn(data) }
  writeError(data: string) { this.error.write(data) }
  writeErrorLn(data: string) { this.error.writeLn(data) }
  async prompt(msg: string): Promise<boolean> {
    this.write(`${msg} (y/n) `)
    const line = await this.readLn()
    return line.trim().toLowerCase() === 'y'
  }
}
