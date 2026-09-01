import { FRead, FReadKeyOptions, FWrite } from './fs'
import { Pred } from '@/utils/types'

class PipeBuffer {
  content = ''
  isReaderClosed = false
  isWriterClosed = false
  private readonly waiters = new Set<() => void>()

  write(data: string) {
    if (this.isWriterClosed || this.isReaderClosed || ! data) return
    this.content += data
    this.wakeWaiters()
  }

  readChar() {
    const codePoint = this.content.codePointAt(0)
    if (codePoint === undefined) return null
    const char = String.fromCodePoint(codePoint)
    this.content = this.content.slice(char.length)
    return char
  }

  closeReader() {
    if (this.isReaderClosed) return
    this.isReaderClosed = true
    this.content = ''
    this.wakeWaiters()
  }

  closeWriter() {
    if (this.isWriterClosed) return
    this.isWriterClosed = true
    this.wakeWaiters()
  }

  wait(signal?: AbortSignal) {
    if (this.content || this.isReaderClosed || this.isWriterClosed) return Promise.resolve(true)
    if (signal?.aborted) return Promise.resolve(false)

    return new Promise<boolean>((resolve) => {
      const finish = (hasData: boolean) => {
        this.waiters.delete(onData)
        signal?.removeEventListener('abort', onAbort)
        resolve(hasData)
      }
      const onData = () => finish(true)
      const onAbort = () => finish(false)
      this.waiters.add(onData)
      signal?.addEventListener('abort', onAbort, { once: true })
    })
  }

  private wakeWaiters() {
    const waiters = [...this.waiters]
    this.waiters.clear()
    waiters.forEach(wake => wake())
  }
}

export class PipeReader implements FRead {
  private closed = false

  constructor(private readonly buffer: PipeBuffer) {}

  async readKey({ signal }: FReadKeyOptions = {}) {
    while (true) {
      if (this.closed || this.buffer.isReaderClosed) return '\x04'
      const char = this.buffer.readChar()
      if (char !== null) return char
      if (this.buffer.isWriterClosed) return '\x04'
      if (! await this.buffer.wait(signal)) return '\x03'
    }
  }

  async readUntil(pred: Pred<string>, options?: FReadKeyOptions) {
    let data = ''
    while (true) {
      const char = await this.readKey(options)
      if (options?.signal?.aborted) return data
      if (char === '\x04' || pred(char)) return data
      data += char
    }
  }

  read(options?: FReadKeyOptions) {
    return this.readUntil(() => false, options)
  }

  readLn(options?: FReadKeyOptions) {
    return this.readUntil(char => char === '\n', options)
  }

  close() {
    if (this.closed) return
    this.closed = true
    this.buffer.closeReader()
  }
}

export class PipeWriter implements FWrite {
  private closed = false

  constructor(private readonly buffer: PipeBuffer) {}

  write(data: string) {
    if (this.closed) return
    this.buffer.write(data)
  }

  writeLn(data: string) {
    this.write(data + '\n')
  }

  close() {
    if (this.closed) return
    this.closed = true
    this.buffer.closeWriter()
  }
}

export const createPipe = () => {
  const buffer = new PipeBuffer()
  return {
    reader: new PipeReader(buffer),
    writer: new PipeWriter(buffer),
  }
}
