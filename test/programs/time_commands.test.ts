import { describe, expect, it } from 'vitest'
import { times } from '@/programs/times'
import { formatUptime, uptime } from '@/programs/uptime'
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
  let now = 100
  const output = new MemoryOutput()
  const time = new TimeService({
    monotonic: { nowMs: () => now },
    gameState: {
      worldTimeMs: Date.parse('2099-07-13T23:30:05.000Z'),
      rate: 0,
      running: true,
      timezone: 'UTC',
    },
  })
  const context = { processes: new ProcessTable(), time } as Context
  const process = new Process(context, null, {
    name: 'hsh',
    stdio: new Stdio(new EmptyInput(), output),
  })
  return {
    output,
    process,
    setNow: (value: number) => { now = value },
  }
}

describe('time-related status commands', () => {
  it('reports boot uptime using monotonic time and game time of day', async () => {
    const { output, process, setNow } = createProcess()
    setNow(90_061_100)

    await expect(uptime(process, 'uptime')).resolves.toBe(0)

    expect(output.content).toBe('23:30:05 up 1 day, 01:01:01, 1 process\n')
    expect(formatUptime(180_061_000)).toBe('2 days, 02:01:01')
  })

  it('prints shell and completed-child CPU totals', async () => {
    const { output, process } = createProcess()
    process.accounting.addUser(61_250)
    process.accounting.addSystem(500)
    process.accounting.addChild({ userMs: 2_000, systemMs: 250, blockedMs: 10_000 })

    await expect(times(process, 'times')).resolves.toBe(0)

    expect(output.content).toBe(
      '1m1.250s 0m0.500s\n' +
      '0m2.000s 0m0.250s\n',
    )
  })
})
