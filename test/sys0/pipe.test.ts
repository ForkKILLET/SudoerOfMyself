import { describe, expect, it } from 'vitest'
import { createPipe } from '@/sys0/pipe'
import { FdTable, OpenFileDescription } from '@/sys0/fd'

describe('anonymous pipe', () => {
  it('blocks reads until data is written', async () => {
    const pipe = createPipe()
    let hasResolved = false
    const reading = pipe.reader.readKey().then((char) => {
      hasResolved = true
      return char
    })

    await Promise.resolve()
    expect(hasResolved).toBe(false)

    pipe.writer.write('x')
    await expect(reading).resolves.toBe('x')
  })

  it('delivers buffered data before EOF when the writer closes', async () => {
    const pipe = createPipe()
    pipe.writer.write('hello\nworld')
    pipe.writer.close()

    await expect(pipe.reader.readLn()).resolves.toBe('hello')
    await expect(pipe.reader.read()).resolves.toBe('world')
    await expect(pipe.reader.readKey()).resolves.toBe('\x04')
  })

  it('wakes a blocked reader with EOF when the writer closes', async () => {
    const pipe = createPipe()
    const reading = pipe.reader.read()

    pipe.writer.close()

    await expect(reading).resolves.toBe('')
  })

  it('allows an interrupted process to cancel a blocked read', async () => {
    const pipe = createPipe()
    const abortController = new AbortController()
    const reading = pipe.reader.read({ signal: abortController.signal })

    abortController.abort()

    await expect(reading).resolves.toBe('')
  })

  it('delays EOF until the last duplicated writer descriptor closes', async () => {
    const pipe = createPipe()
    const table = new FdTable()
    const description = new OpenFileDescription({
      writable: pipe.writer,
      close: () => pipe.writer.close(),
    })
    table.set(1, description).unwrap()
    table.duplicate(1, 4).unwrap()

    table.close(1).unwrap()
    table.getWritable(4).unwrap().writeLn('still open')
    expect(await pipe.reader.readLn()).toBe('still open')

    const eof = pipe.reader.readKey()
    table.close(4).unwrap()
    await expect(eof).resolves.toBe('\x04')
  })

  it('keeps a pipe writer open while an inherited descriptor remains', async () => {
    const pipe = createPipe()
    const parent = new FdTable()
    parent.open({
      writable: pipe.writer,
      close: () => pipe.writer.close(),
    }).unwrap()
    const child = parent.fork()

    parent.closeAll()
    child.getWritable(0).unwrap().writeLn('child')
    expect(await pipe.reader.readLn()).toBe('child')

    const eof = pipe.reader.readKey()
    child.closeAll()
    await expect(eof).resolves.toBe('\x04')
  })
})
