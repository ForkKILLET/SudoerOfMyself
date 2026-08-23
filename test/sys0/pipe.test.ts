import { describe, expect, it } from 'vitest'
import { createPipe } from '@/sys0/pipe'

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
})
