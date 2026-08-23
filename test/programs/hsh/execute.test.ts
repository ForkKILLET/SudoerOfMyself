import { describe, expect, it } from 'vitest'
import { Ok } from 'fk-result'
import { execute } from '@/programs/hsh'
import { Context } from '@/sys0/context'
import { FRead, FWrite } from '@/sys0/fs'
import { Process } from '@/sys0/proc'
import { Program } from '@/sys0/program'
import { signalExit } from '@/sys0/process_exit'
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

const createShellProcess = (program: Program) => {
  const output = new MemoryOutput()
  const context = {
    exec: {
      resolve: () => Ok({ program }),
    },
  } as unknown as Context
  const process = new Process(context, null, {
    name: 'hsh',
    env: { HOME: '/', PATH: '/bin', PWD: '/' },
    stdio: new Stdio(new EmptyInput(), output),
  })
  return { output, process }
}

describe('hsh execution', () => {
  it('writes a newline after a foreground command is interrupted', async () => {
    const { output, process } = createShellProcess(() => signalExit('SIGINT'))

    const exitCode = await execute(process, { name: 'interrupted', args: [] }, {})

    expect(exitCode).toBe(130)
    expect(output.content).toBe('\n')
  })

  it('does not treat an ordinary exit code 130 as a signal', async () => {
    const { output, process } = createShellProcess(() => 130)

    const exitCode = await execute(process, { name: 'ordinary', args: [] }, {})

    expect(exitCode).toBe(130)
    expect(output.content).toBe('')
  })
})
