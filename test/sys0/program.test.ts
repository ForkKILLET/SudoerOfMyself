import { describe, expect, it } from 'vitest'
import { Process } from '@/sys0/proc'
import { createCommand } from '@/sys0/program'

const createProcess = () => {
  const errors: string[] = []
  const process = {
    error: (message: string) => errors.push(message),
  } as unknown as Process
  return { errors, process }
}

describe('Command option parsing', () => {
  it('merges boolean short options', async () => {
    let received: unknown
    const command = createCommand('tool', '<FILE>', '')
      .option('recursive', '-r', 'boolean')
      .option('force', '-f', 'boolean')
      .option('verbose', '-v', 'boolean')
      .program(({ options }, ...args) => {
        received = { options, args }
        return 0
      })

    await expect(command(createProcess().process, 'tool', '-rfv', 'file')).resolves.toBe(0)
    expect(received).toEqual({
      options: { recursive: true, force: true, verbose: true },
      args: ['file'],
    })
  })

  it('uses the remainder of a cluster as an option argument', async () => {
    let received: unknown
    const command = createCommand('tool', '', '')
      .option('recursive', '-r', 'boolean')
      .option('signal', '-s', 'string')
      .program(({ options }, ...args) => {
        received = { options, args }
        return 0
      })

    await expect(command(createProcess().process, 'tool', '-rsTERM', 'target')).resolves.toBe(0)
    expect(received).toEqual({
      options: { recursive: true, signal: 'TERM' },
      args: ['target'],
    })
  })

  it('takes a separate argument when a value option ends the cluster', async () => {
    let received: unknown
    const command = createCommand('tool', '', '')
      .option('verbose', '-v', 'boolean')
      .option('count', '-n', 'integer')
      .program(({ options }, ...args) => {
        received = { options, args }
        return 0
      })

    await expect(command(createProcess().process, 'tool', '-vn', '5', 'file')).resolves.toBe(0)
    expect(received).toEqual({
      options: { verbose: true, count: 5 },
      args: ['file'],
    })
  })

  it('keeps an unknown cluster wholly intact in make-arg mode', async () => {
    let received: unknown
    const command = createCommand('echo-like', '', '')
      .whenUnknownOption('make-arg')
      .option('noNewline', '-n', 'boolean')
      .program(({ options }, ...args) => {
        received = { options, args }
        return 0
      })

    await expect(command(createProcess().process, 'echo-like', '-nx')).resolves.toBe(0)
    expect(received).toEqual({ options: {}, args: ['-nx'] })
  })

  it('reports the unknown member of a cluster', async () => {
    const { errors, process } = createProcess()
    const command = createCommand('tool', '', '')
      .option('recursive', '-r', 'boolean')
      .program(() => 0)

    await expect(command(process, 'tool', '-rx')).resolves.toBe(1)
    expect(errors).toEqual(['Unknown option: -x'])
  })
})
