import { describe, expect, it, vi } from 'vitest'
import { TerminalSession } from '@/sys0/terminal_session'
import type { Term } from '@/sys0/term'

const createTerm = () => {
  const writes: string[] = []
  let applicationHandler: ((event: KeyboardEvent) => boolean) | null = null
  const term = {
    doEcho: true,
    signalInterrupt: true,
    write: (data: string) => writes.push(data),
    onResize: vi.fn(() => ({ dispose: vi.fn() })),
    setApplicationKeyHandler: (handler: ((event: KeyboardEvent) => boolean) | null) => {
      applicationHandler = handler
    },
  } as unknown as Term
  return {
    get applicationHandler() { return applicationHandler },
    term,
    writes,
  }
}

describe('full-screen terminal session', () => {
  it('enters raw alternate-screen mode and restores terminal state', () => {
    const terminal = createTerm()
    const session = new TerminalSession(terminal.term)

    expect(terminal.term.doEcho).toBe(false)
    expect(terminal.term.signalInterrupt).toBe(false)
    expect(terminal.writes[0]).toContain('\x1B[?1049h')
    expect(terminal.writes[0]).toContain('\x1B[?2004h')
    expect(terminal.applicationHandler).not.toBeNull()

    session.dispose()

    expect(terminal.term.doEcho).toBe(true)
    expect(terminal.term.signalInterrupt).toBe(true)
    expect(terminal.writes[1]).toContain('\x1B[?1049l')
    expect(terminal.writes[1]).toContain('\x1B[?2004l')
    expect(terminal.applicationHandler).toBeNull()
  })

  it('rejects overlapping sessions and permits a new session after disposal', () => {
    const { term } = createTerm()
    const first = new TerminalSession(term)

    expect(() => new TerminalSession(term)).toThrow('already has an active')
    first.dispose()

    const second = new TerminalSession(term)
    second.dispose()
  })

  it('prevents browser control shortcuts while still forwarding them to xterm', () => {
    const terminal = createTerm()
    const session = new TerminalSession(terminal.term)
    const event = {
      type: 'keydown',
      ctrlKey: true,
      metaKey: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent

    expect(terminal.applicationHandler?.(event)).toBe(true)
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(event.stopPropagation).toHaveBeenCalledOnce()
    session.dispose()
  })
})
