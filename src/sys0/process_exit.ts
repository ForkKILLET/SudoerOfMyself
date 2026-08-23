export const PROCESS_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGKILL'] as const
export type ProcessSignal = typeof PROCESS_SIGNALS[number]

export type ProcessExit =
  | { reason: 'exit', code: number }
  | { reason: 'signal', signal: ProcessSignal, code: number }

export type ProgramResult = number | ProcessExit

const SIGNAL_EXIT_CODES: Record<ProcessSignal, number> = {
  SIGINT: 130,
  SIGTERM: 143,
  SIGKILL: 137,
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
