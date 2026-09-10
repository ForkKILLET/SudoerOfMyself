import { describe, expect, it } from 'vitest'
import { isImmersiveModeShortcut } from '@/immersive_mode'

const keyEvent = (overrides: Partial<KeyboardEvent> = {}) => ({
  key: 'F11',
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  shiftKey: false,
  repeat: false,
  ...overrides,
}) as KeyboardEvent

describe('immersive mode shortcut', () => {
  it('accepts an unmodified, non-repeating F11 press', () => {
    expect(isImmersiveModeShortcut(keyEvent())).toBe(true)
  })

  it.each([
    ['another key', { key: 'F10' }],
    ['Ctrl+F11', { ctrlKey: true }],
    ['Alt+F11', { altKey: true }],
    ['Meta+F11', { metaKey: true }],
    ['Shift+F11', { shiftKey: true }],
    ['repeated F11', { repeat: true }],
  ])('rejects %s', (_, overrides) => {
    expect(isImmersiveModeShortcut(keyEvent(overrides))).toBe(false)
  })
})
