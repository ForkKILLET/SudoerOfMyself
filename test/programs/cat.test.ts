import { describe, expect, it } from 'vitest'
import { cat } from '@/programs/cat'
import { Context } from '@/sys0/context'
import { FWrite } from '@/sys0/fs'
import { createPipe } from '@/sys0/pipe'
import { Process } from '@/sys0/proc'
import { ProcessTable } from '@/sys0/process_table'
import { Stdin, Stdio } from '@/sys0/stdio'
import { Term } from '@/sys0/term'

const deferred = () => {
  let resolve = () => {}
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

class ObservableOutput implements FWrite {
  content = ''
  onWrite?: () => void

  write(data: string) {
    this.content += data
    this.onWrite?.()
  }

  writeLn(data: string) {
    this.write(data + '\n')
  }
}

const createRoot = (stdio: Stdio) => new Process({
  processes: new ProcessTable(),
} as Context, null, {
  name: 'shell',
  stdio,
})

describe('cat standard input', () => {
  it('streams pipe input before EOF', async () => {
    const input = createPipe()
    const output = new ObservableOutput()
    const received = deferred()
    output.onWrite = () => {
      if (output.content === 'first line\n') received.resolve()
    }
    const root = createRoot(new Stdio(input.reader, output))
    let finished = false
    const running = root.spawn(cat, { name: 'cat' }, '-').then(() => {
      finished = true
    })

    input.writer.write('first line\n')
    await received.promise

    expect(output.content).toBe('first line\n')
    expect(finished).toBe(false)
    input.writer.close()
    await running
  })

  it('emits terminal input once per completed line instead of waiting for EOF', async () => {
    let onData: ((data: string) => void) | undefined
    const term = {
      on: (event: string, listener: (data: string) => void) => {
        if (event === 'data') onData = listener
        return { dispose() {} }
      },
    } as unknown as Term
    const output = new ObservableOutput()
    const received = deferred()
    output.onWrite = () => received.resolve()
    const stdin = new Stdin(term)
    const root = createRoot(new Stdio(stdin, output))
    const running = root.spawn(cat, { name: 'cat' })
    await Promise.resolve()

    onData?.('typed input')
    await Promise.resolve()
    expect(output.content).toBe('')
    onData?.('\r')
    await received.promise

    expect(output.content).toBe('typed input\n')
    onData?.('\x04')
    await running
  })
})
