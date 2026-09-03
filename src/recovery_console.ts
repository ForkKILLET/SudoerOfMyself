import { errorMessage } from '@/utils/errors'
import type { Awaitable } from '@/utils/types'

export interface RecoveryConsoleIo {
  readLn(): Awaitable<string>
  write(data: string): void
  writeLn(data: string): void
}

export interface RecoveryConsoleActions {
  exportSave(): Promise<void>
  resetSave(): Promise<void>
  reload(): void
}

export interface RecoveryConsoleOptions {
  eyebrow: string
  title: string
  description: string
  storageName: string
  recoveryActions: boolean
  error?: unknown
}

const ANSI = {
  reset: '\x1B[0m',
  bold: '\x1B[1m',
  dim: '\x1B[2m',
  green: '\x1B[32m',
  yellow: '\x1B[33m',
  red: '\x1B[31m',
}

const style = (format: string, value: string) => `${format}${value}${ANSI.reset}`

const sanitizeTerminalText = (value: string) => value
  .replace(/\r\n?/g, '\n')
  .replace(/[\x00-\x08\x0B-\x1F\x7F-\x9F]/g, (character) => {
    if (character === '\x1B') return '^['
    return `\\x${character.charCodeAt(0).toString(16).padStart(2, '0')}`
  })

const getErrorDetails = (error: unknown) => sanitizeTerminalText(
  error instanceof Error && error.stack ? error.stack : errorMessage(error),
)

const availableCommands = (recoveryActions: boolean, hasError: boolean) => [
  ...(recoveryActions
    ? [
        ['export', 'Download the local save for inspection.'],
        ['reset', 'Delete the local save and restart HumanOS.'],
      ] as const
    : []),
  ...(hasError ? [['details', 'Print the startup error again.']] as const : []),
  ['reload', 'Reload the page without changing local data.'],
  ['help', 'Show this command list.'],
] as const

const writeCommandList = (
  io: RecoveryConsoleIo,
  { recoveryActions, error }: RecoveryConsoleOptions,
) => {
  io.writeLn(style(ANSI.bold, 'Available commands:'))
  availableCommands(recoveryActions, error !== undefined).forEach(([command, description]) => {
    io.writeLn(`  ${command.padEnd(9)}${description}`)
  })
}

const writeFailureHeader = (io: RecoveryConsoleIo, options: RecoveryConsoleOptions) => {
  io.write('\x1B[2J\x1B[H')
  io.writeLn(style(ANSI.green, 'HumanOS emergency console'))
  io.writeLn(style(ANSI.dim, '─────────────────────────'))
  io.writeLn('')
  io.writeLn(style(ANSI.yellow, options.eyebrow))
  io.writeLn(style(ANSI.bold, options.title))
  io.writeLn(style(ANSI.dim, `Storage: ${options.storageName}`))
  io.writeLn(options.description)
  io.writeLn('')
  if (options.error !== undefined) {
    io.writeLn(style(ANSI.red, 'Startup error:'))
    io.writeLn(getErrorDetails(options.error))
    io.writeLn('')
  }
  writeCommandList(io, options)
  io.writeLn('')
}

export const runRecoveryConsole = async (
  io: RecoveryConsoleIo,
  options: RecoveryConsoleOptions,
  actions: RecoveryConsoleActions,
) => {
  writeFailureHeader(io, options)

  while (true) {
    io.write(style(ANSI.green, 'recovery> '))
    const command = (await io.readLn()).trim().toLowerCase()
    if (! command) continue

    if (command === 'help') {
      writeCommandList(io, options)
      continue
    }
    if (command === 'details' && options.error !== undefined) {
      io.writeLn(getErrorDetails(options.error))
      continue
    }
    if (command === 'reload') {
      io.writeLn('Reloading...')
      actions.reload()
      return
    }
    if (command === 'export' && options.recoveryActions) {
      io.writeLn('Exporting local save...')
      try {
        await actions.exportSave()
        io.writeLn('Save exported.')
      }
      catch (error) {
        io.writeLn(style(ANSI.red, `Export failed: ${errorMessage(error)}`))
      }
      continue
    }
    if (command === 'reset' && options.recoveryActions) {
      io.write('Delete the local save permanently? Type "yes" to continue: ')
      if ((await io.readLn()).trim().toLowerCase() !== 'yes') {
        io.writeLn('Reset cancelled.')
        continue
      }
      io.writeLn('Deleting local save...')
      try {
        await actions.resetSave()
        io.writeLn('Local save deleted. Reloading...')
        actions.reload()
        return
      }
      catch (error) {
        io.writeLn(style(ANSI.red, `Reset failed: ${errorMessage(error)}`))
      }
      continue
    }

    io.writeLn(`Unknown or unavailable command: ${command}`)
    io.writeLn('Type "help" to list available commands.')
  }
}
