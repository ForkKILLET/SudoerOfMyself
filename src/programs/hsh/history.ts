export const parseHistoryLimit = (value: string | undefined, fallback: number) => {
  if (value === undefined || ! /^\d+$/.test(value)) return fallback
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : fallback
}

export const parseHistoryFile = (content: string) => {
  if (! content) return []
  const withoutFinalNewline = content.endsWith('\n') ? content.slice(0, - 1) : content
  return withoutFinalNewline.split('\n').filter(line => line.trim())
}

export const appendHistoryEntry = (content: string, entry: string, limit: number) => {
  const entries = [...parseHistoryFile(content), entry]
  const retained = limit > 0 ? entries.slice(- limit) : []
  return retained.length ? `${retained.join('\n')}\n` : ''
}
