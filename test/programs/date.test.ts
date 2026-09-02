import { describe, expect, it } from 'vitest'
import { date } from '@/programs/date'
import { Context } from '@/sys0/context'
import { FRead, FWrite } from '@/sys0/fs'
import { Process } from '@/sys0/proc'
import { ProcessTable } from '@/sys0/process_table'
import { Stdio } from '@/sys0/stdio'
import { TimeService } from '@/sys0/time'

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

const createProcess = () => {
  const output = new MemoryOutput()
  const error = new MemoryOutput()
  const context = {
    processes: new ProcessTable(),
    time: new TimeService({
      monotonic: { nowMs: () => 0 },
      gameState: {
        worldTimeMs: Date.parse('2099-07-13T23:30:05.000Z'),
        rate: 0,
        running: true,
        timezone: 'Asia/Shanghai',
      },
    }),
  } as Context
  const process = new Process(context, null, {
    name: 'date',
    stdio: new Stdio(new EmptyInput(), output, error),
  })
  return { error, output, process }
}

describe('date', () => {
  it('displays game time in the configured timezone', async () => {
    const { output, process } = createProcess()

    await expect(date(process, 'date', '+%F %T %z')).resolves.toBe(0)
    expect(output.content).toBe('2099-07-14 07:30:05 +0800\n')
  })

  it('supports UTC without exposing host time', async () => {
    const { output, process } = createProcess()

    await expect(date(process, 'date', '-u', '+%F %T %Z')).resolves.toBe(0)
    expect(output.content).toBe('2099-07-13 23:30:05 UTC\n')
  })

  it('rejects attempts to set the game clock', async () => {
    const { error, process } = createProcess()

    await expect(date(process, 'date', 'tomorrow')).resolves.toBe(1)
    expect(error.content).toContain('Setting the date is not supported')
  })
})
