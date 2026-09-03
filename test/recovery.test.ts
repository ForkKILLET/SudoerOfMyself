import { describe, expect, it, vi } from 'vitest'
import {
  type RecoveryConsoleActions,
  type RecoveryConsoleIo,
  runRecoveryConsole,
} from '@/recovery_console'

class MemoryRecoveryConsole implements RecoveryConsoleIo {
  output = ''

  constructor(private readonly input: string[]) {}

  readLn() {
    const line = this.input.shift()
    if (line === undefined) throw new Error('Recovery console requested unexpected input')
    return line
  }

  write(data: string) {
    this.output += data
  }

  writeLn(data: string) {
    this.write(`${data}\n`)
  }
}

const createActions = (): RecoveryConsoleActions => ({
  exportSave: vi.fn(async () => {}),
  resetSave: vi.fn(async () => {}),
  reload: vi.fn(),
})

const createOptions = (recoveryActions: boolean) => ({
  eyebrow: 'RECOVERY MODE',
  title: 'HumanOS could not start',
  description: 'The local save may be damaged.',
  storageName: 'main',
  recoveryActions,
  error: new Error('damaged inode'),
})

describe('recovery console', () => {
  it('exports a save and stays open until reload is requested', async () => {
    const io = new MemoryRecoveryConsole(['export', 'reload'])
    const actions = createActions()

    await runRecoveryConsole(io, createOptions(true), actions)

    expect(actions.exportSave).toHaveBeenCalledOnce()
    expect(actions.reload).toHaveBeenCalledOnce()
    expect(io.output).toContain('HumanOS emergency console')
    expect(io.output).toContain('damaged inode')
    expect(io.output).toContain('Save exported.')
  })

  it('requires explicit confirmation before resetting the save', async () => {
    const io = new MemoryRecoveryConsole(['reset', 'no', 'reset', 'yes'])
    const actions = createActions()

    await runRecoveryConsole(io, createOptions(true), actions)

    expect(actions.resetSave).toHaveBeenCalledOnce()
    expect(actions.reload).toHaveBeenCalledOnce()
    expect(io.output).toContain('Reset cancelled.')
    expect(io.output).toContain('Local save deleted. Reloading...')
  })

  it('does not expose destructive actions when startup is only blocked', async () => {
    const io = new MemoryRecoveryConsole(['export', 'reload'])
    const actions = createActions()

    await runRecoveryConsole(io, createOptions(false), actions)

    expect(actions.exportSave).not.toHaveBeenCalled()
    expect(actions.resetSave).not.toHaveBeenCalled()
    expect(io.output).toContain('Unknown or unavailable command: export')
    expect(io.output).not.toContain('Download the local save for inspection.')
  })

  it('renders control characters in error details without executing them', async () => {
    const io = new MemoryRecoveryConsole(['reload'])
    const actions = createActions()

    await runRecoveryConsole(io, {
      ...createOptions(false),
      error: 'bad\x1B[2Jsave',
    }, actions)

    expect(io.output).toContain('bad^[[2Jsave')
    expect(io.output).not.toContain('bad\x1B[2Jsave')
  })

  it('omits error-only commands when recovery mode was requested explicitly', async () => {
    const io = new MemoryRecoveryConsole(['details', 'reload'])
    const actions = createActions()

    await runRecoveryConsole(io, {
      eyebrow: 'RECOVERY MODE',
      title: 'HumanOS recovery tools',
      description: 'Recovery mode was requested.',
      storageName: 'main',
      recoveryActions: true,
    }, actions)

    expect(io.output).not.toContain('Startup error:')
    expect(io.output).not.toContain('Print the startup error again.')
    expect(io.output).toContain('Unknown or unavailable command: details')
  })
})
