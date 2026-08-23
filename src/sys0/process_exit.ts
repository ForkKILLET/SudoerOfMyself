export type ProcessSignal = 'SIGINT'

export type ProcessExit =
  | { reason: 'exit', code: number }
  | { reason: 'signal', signal: ProcessSignal, code: number }

export type ProgramResult = number | ProcessExit

const SIGNAL_EXIT_CODES: Record<ProcessSignal, number> = {
  SIGINT: 130,
}

export const normalExit = (code: number): ProcessExit => ({
  reason: 'exit',
  code,
})

export const signalExit = (signal: ProcessSignal): ProcessExit => ({
  reason: 'signal',
  signal,
  code: SIGNAL_EXIT_CODES[signal],
})

export const normalizeExit = (result: ProgramResult): ProcessExit => (
  typeof result === 'number' ? normalExit(result) : result
)
