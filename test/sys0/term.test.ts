import { describe, expect, it, vi } from 'vitest'
import { handleTerminalCopyShortcut } from '@/sys0/terminal_shortcuts'

const createKeyEvent = (overrides: Partial<KeyboardEvent> = {}) => ({
  type: 'keydown',
  key: 'C',
  ctrlKey: true,
  shiftKey: true,
  altKey: false,
  metaKey: false,
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  ...overrides,
}) as unknown as KeyboardEvent

describe('terminal keyboard shortcuts', () => {
  it('copies the selected text and prevents Ctrl-Shift-C default handling', async () => {
    const event = createKeyEvent()
    const writeClipboard = vi.fn(async () => undefined)

    expect(handleTerminalCopyShortcut(event, () => 'selected text', writeClipboard)).toBe(false)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.stopPropagation).toHaveBeenCalledOnce()
    expect(writeClipboard).toHaveBeenCalledWith('selected text')
  })

  it('still suppresses the shortcut when no text is selected', () => {
    const event = createKeyEvent()
    const writeClipboard = vi.fn(async () => undefined)

    expect(handleTerminalCopyShortcut(event, () => '', writeClipboard)).toBe(false)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(writeClipboard).not.toHaveBeenCalled()
  })

  it.each([
    ['plain Ctrl-C', { shiftKey: false }],
    ['Ctrl-Alt-Shift-C', { altKey: true }],
    ['Meta-Ctrl-Shift-C', { metaKey: true }],
    ['another key', { key: 'V' }],
    ['keyup', { type: 'keyup' }],
  ])('leaves %s to the terminal', (_, overrides) => {
    const event = createKeyEvent(overrides)

    expect(handleTerminalCopyShortcut(event, () => 'selected')).toBe(true)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(event.stopPropagation).not.toHaveBeenCalled()
  })
})
