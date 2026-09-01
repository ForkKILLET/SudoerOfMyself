type ClipboardWriter = (text: string) => Promise<void>

export const handleTerminalCopyShortcut = (
  event: KeyboardEvent,
  getSelection: () => string,
  writeClipboard: ClipboardWriter = async (text) => {
    if (! navigator.clipboard?.writeText) throw new Error('Clipboard API is unavailable')
    await navigator.clipboard.writeText(text)
  },
) => {
  const isCopyShortcut = event.type === 'keydown'
    && event.ctrlKey
    && event.shiftKey
    && ! event.altKey
    && ! event.metaKey
    && event.key.toLowerCase() === 'c'
  if (! isCopyShortcut) return true

  event.preventDefault()
  event.stopPropagation()
  const selection = getSelection()
  if (selection) {
    void writeClipboard(selection).catch((error: unknown) => {
      console.warn('Could not copy terminal selection', error)
    })
  }
  return false
}
