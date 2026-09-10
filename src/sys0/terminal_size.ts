export interface TerminalSize {
  cols: number
  rows: number
}

export type TerminalSizePreference = { mode: 'fit', custom?: TerminalSize } | ({ mode: 'fixed' } & TerminalSize)

export const DEFAULT_TERMINAL_SIZE: TerminalSize = { cols: 97, rows: 30 }
const MAX_COLS = 500
const MAX_ROWS = 200

export const defaultTerminalSizePreference = (): TerminalSizePreference => ({ mode: 'fixed', ...DEFAULT_TERMINAL_SIZE })

const validSize = (size: TerminalSize | undefined) => size
  && Number.isInteger(size.cols) && size.cols >= 2 && size.cols <= MAX_COLS
  && Number.isInteger(size.rows) && size.rows >= 1 && size.rows <= MAX_ROWS

export const parseTerminalSizePreference = (value: string | null): TerminalSizePreference => {
  try {
    const parsed = JSON.parse(value ?? 'null')
    if (parsed?.mode === 'fit') return validSize(parsed.custom)
      ? { mode: 'fit', custom: { cols: parsed.custom.cols, rows: parsed.custom.rows } }
      : { mode: 'fit' }
    if (parsed?.mode === 'fixed' && validSize(parsed)) {
      return { mode: 'fixed', cols: parsed.cols, rows: parsed.rows }
    }
  }
  catch { /* Invalid preferences must not prevent boot. */ }
  return defaultTerminalSizePreference()
}

export const toggleTerminalSizePreference = (preference: TerminalSizePreference): TerminalSizePreference => (
  preference.mode === 'fit'
    ? { mode: 'fixed', ...preference.custom ?? DEFAULT_TERMINAL_SIZE }
    : { mode: 'fit', custom: { cols: preference.cols, rows: preference.rows } }
)

export const fitTerminalSize = (preference: TerminalSizePreference, available: TerminalSize): TerminalSize => ({
  cols: Math.max(2, Math.min(MAX_COLS, Math.floor(available.cols), preference.mode === 'fixed' ? preference.cols : MAX_COLS)),
  rows: Math.max(1, Math.min(MAX_ROWS, Math.floor(available.rows), preference.mode === 'fixed' ? preference.rows : MAX_ROWS)),
})

export const dragTerminalSize = (
  initial: TerminalSize,
  delta: { x: number, y: number },
  cell: { width: number, height: number },
): TerminalSize => ({
  // The terminal remains centered, so each edge moves by half the size change.
  cols: Math.max(20, initial.cols + Math.round(2 * delta.x / cell.width)),
  rows: Math.max(5, initial.rows + Math.round(2 * delta.y / cell.height)),
})
