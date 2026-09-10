export const numberWidth = (enabled: boolean, lineCount: number, columns: number) => (
  enabled && columns >= 4 ? Math.min(columns - 1, Math.max(3, String(lineCount).length + 1)) : 0
)

export const lineNumber = (row: number | undefined, width: number, active = false, color?: string) => {
  if (! width) return ''
  if (row === undefined) return ' '.repeat(width)
  return (color ?? (active ? '\x1B[1;93m' : '\x1B[90m')) + String(row + 1).padStart(width - 1).slice(- (width - 1)) + '\x1B[0m '
}
