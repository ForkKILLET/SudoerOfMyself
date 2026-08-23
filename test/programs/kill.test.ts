import { describe, expect, it } from 'vitest'
import { kill } from '@/programs/kill'
import { Context } from '@/sys0/context'
import { FRead, FWrite } from '@/sys0/fs'
import { JobTable, ProcessGroup } from '@/sys0/job'
import { Process } from '@/sys0/proc'
import { ProcessSignal, signalExit } from '@/sys0/process_exit'
import { ProcessTable } from '@/sys0/process_table'
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

const createShell = () => {
  const output = new MemoryOutput()
  const error = new MemoryOutput()
  const context = { processes: new ProcessTable() } as Context
  const shell = new Process(context, null, {
    name: 'hsh',
    env: { HOME: '/', PATH: '/bin', PWD: '/' },
    stdio: new Stdio(new EmptyInput(), output, error),
  })
  shell.jobTable = new JobTable()
  return { error, shell }
}

const startBackground = (shell: Process) => {
  const group = new ProcessGroup()
  let receivedSignal: ProcessSignal | undefined
  const completion = shell.spawn(child => new Promise((resolve) => {
    child.on('signal', (signal) => {
      receivedSignal = signal
      resolve(signalExit(signal))
    })
  }), {
    name: 'long-running',
    foreground: false,
    processGroup: group,
  })
  const child = shell.subProcesses[0]
  const job = shell.jobTable?.create(group, 'long-running &', completion)
  shell.env['!'] = child.pid.toString()
  return { child, completion, getReceivedSignal: () => receivedSignal, job }
}

describe('kill builtin', () => {
  it('sends SIGTERM to the PID stored in $!', async () => {
    const { shell } = createShell()
    const background = startBackground(shell)

    await expect(kill(shell, 'kill', shell.env['!'])).resolves.toBe(0)
    await expect(background.completion).resolves.toEqual(signalExit('SIGTERM'))
    expect(background.getReceivedSignal()).toBe('SIGTERM')
  })

  it('sends an explicit signal to a job process group', async () => {
    const { shell } = createShell()
    const background = startBackground(shell)

    await expect(kill(shell, 'kill', '-INT', '%1')).resolves.toBe(0)
    await expect(background.job?.completion).resolves.toEqual(signalExit('SIGINT'))
    expect(background.getReceivedSignal()).toBe('SIGINT')
  })

  it('checks existence with signal zero and reports missing targets', async () => {
    const { error, shell } = createShell()
    const background = startBackground(shell)

    await expect(kill(shell, 'kill', '-0', background.child.pid.toString())).resolves.toBe(0)
    expect(background.getReceivedSignal()).toBeUndefined()
    await expect(kill(shell, 'kill', '-0', '999')).resolves.toBe(1)
    expect(error.content).toContain('999: no such process')

    background.child.sendSignal('SIGKILL')
    await background.completion
  })
})
