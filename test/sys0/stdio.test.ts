import { describe, expect, it } from 'vitest'
import { Stdin } from '@/sys0/stdio'
import { Term } from '@/sys0/term'

const createStdin = () => {
  let onData: ((data: string) => void) | undefined
  const term = {
    on: (event: string, listener: (data: string) => void) => {
      if (event === 'data') onData = listener
      return { dispose() {} }
    },
  } as unknown as Term

  return {
    stdin: new Stdin(term),
    paste: (data: string) => onData?.(data),
  }
}

describe('terminal standard input', () => {
  it('queues every line of a multiline paste for successive reads', async () => {
    const { stdin, paste } = createStdin()
    const firstRead = stdin.readKey()

    paste('echo a\necho b')

    await expect(firstRead).resolves.toBe('echo a')
    await expect(stdin.readKey()).resolves.toBe('\r')
    await expect(stdin.readKey()).resolves.toBe('echo b')
  })

  it('treats CRLF as one enter key', async () => {
    const { stdin, paste } = createStdin()

    paste('echo a\r\necho b')

    await expect(stdin.readKey()).resolves.toBe('echo a')
    await expect(stdin.readKey()).resolves.toBe('\r')
    await expect(stdin.readKey()).resolves.toBe('echo b')
  })
})
