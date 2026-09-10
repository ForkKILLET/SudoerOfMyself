import { describe, expect, it } from 'vitest'
import { DEFAULT_TERMINAL_SIZE, dragTerminalSize, fitTerminalSize, parseTerminalSizePreference, toggleTerminalSizePreference } from '@/sys0/terminal_size'

describe('terminal size preferences', () => {
  it.each([null, '', '{', 'null', '[]', '42', '{}', '{"mode":"other"}',
    '{"mode":"fixed","cols":0,"rows":30}', '{"mode":"fixed","cols":97.5,"rows":30}',
    '{"mode":"fixed","cols":97,"rows":0}', '{"mode":"fixed","cols":501,"rows":30}',
    '{"mode":"fixed","cols":97,"rows":201}', '{"mode":"fixed","cols":"97","rows":30}',
  ])('falls back to the default for invalid storage: %s', (stored) => {
    expect(parseTerminalSizePreference(stored)).toEqual({ mode: 'fixed', ...DEFAULT_TERMINAL_SIZE })
  })

  it('restores a fixed size or fit-to-window mode', () => {
    expect(parseTerminalSizePreference('{"mode":"fixed","cols":120,"rows":40}'))
      .toEqual({ mode: 'fixed', cols: 120, rows: 40 })
    expect(parseTerminalSizePreference('{"mode":"fit"}')).toEqual({ mode: 'fit' })
  })

  it('temporarily shrinks a fixed size without losing the desired dimensions', () => {
    const preference = { mode: 'fixed', cols: 120, rows: 40 } as const
    expect(fitTerminalSize(preference, { cols: 60, rows: 20 })).toEqual({ cols: 60, rows: 20 })
    expect(fitTerminalSize(preference, { cols: 200, rows: 80 })).toEqual({ cols: 120, rows: 40 })
    expect(preference).toEqual({ mode: 'fixed', cols: 120, rows: 40 })
  })

  it('toggles directly back to the last custom size, including after a reload', () => {
    const custom = { mode: 'fixed', cols: 120, rows: 40 } as const
    const fit = toggleTerminalSizePreference(custom)
    expect(fit).toEqual({ mode: 'fit', custom: { cols: 120, rows: 40 } })
    expect(fitTerminalSize(fit, { cols: 200, rows: 80 })).toEqual({ cols: 200, rows: 80 })
    expect(toggleTerminalSizePreference(parseTerminalSizePreference(JSON.stringify(fit)))).toEqual(custom)
  })

  it('uses the default custom size for a legacy fit preference', () => {
    expect(toggleTerminalSizePreference(parseTerminalSizePreference('{"mode":"fit"}')))
      .toEqual({ mode: 'fixed', ...DEFAULT_TERMINAL_SIZE })
  })

  it.each([null, {}, { cols: - 1, rows: 30 }, { cols: '97', rows: 30 }])('ignores an invalid remembered custom size: %j', (custom) => {
    const fit = parseTerminalSizePreference(JSON.stringify({ mode: 'fit', custom }))
    expect(fit).toEqual({ mode: 'fit' })
    expect(toggleTerminalSizePreference(fit)).toEqual({ mode: 'fixed', ...DEFAULT_TERMINAL_SIZE })
  })

  it('fits complete cells and caps extreme window sizes', () => {
    expect(fitTerminalSize({ mode: 'fit' }, { cols: 120.8, rows: 40.2 })).toEqual({ cols: 120, rows: 40 })
    expect(fitTerminalSize({ mode: 'fit' }, { cols: 1000, rows: 1000 })).toEqual({ cols: 500, rows: 200 })
    expect(fitTerminalSize({ mode: 'fit' }, { cols: - 10, rows: 0 })).toEqual({ cols: 2, rows: 1 })
  })

  it('snaps centered dragging to cells and allows growth and shrinkage', () => {
    const cell = { width: 10, height: 20 }
    expect(dragTerminalSize(DEFAULT_TERMINAL_SIZE, { x: 15, y: 20 }, cell)).toEqual({ cols: 100, rows: 32 })
    expect(dragTerminalSize(DEFAULT_TERMINAL_SIZE, { x: - 15, y: - 20 }, cell)).toEqual({ cols: 94, rows: 28 })
    expect(dragTerminalSize(DEFAULT_TERMINAL_SIZE, { x: 1, y: 2 }, cell)).toEqual(DEFAULT_TERMINAL_SIZE)
    expect(dragTerminalSize(DEFAULT_TERMINAL_SIZE, { x: - 1000, y: - 1000 }, cell)).toEqual({ cols: 20, rows: 5 })
  })
})
