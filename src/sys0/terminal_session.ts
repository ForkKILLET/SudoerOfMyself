import type { IDisposable } from '@/utils/disposable'
import type { Term } from './term'

const ENTER_ALTERNATE_SCREEN = '\x1B[?1049h'
const LEAVE_ALTERNATE_SCREEN = '\x1B[?1049l'
const ENABLE_BRACKETED_PASTE = '\x1B[?2004h'
const DISABLE_BRACKETED_PASTE = '\x1B[?2004l'
const DISABLE_AUTOWRAP = '\x1B[?7l'
const ENABLE_AUTOWRAP = '\x1B[?7h'
const SHOW_CURSOR = '\x1B[?25h'
const CLEAR_SCREEN = '\x1B[2J\x1B[H'

const activeTerms = new WeakSet<Term>()

export interface TerminalSessionOptions {
  bracketedPaste?: boolean
  interruptAsInput?: boolean
  interceptBrowserShortcuts?: boolean
}

const interceptApplicationShortcut = (event: KeyboardEvent) => {
  if (event.type !== 'keydown' || (! event.ctrlKey && ! event.metaKey)) return true
  event.preventDefault()
  event.stopPropagation()
  return true
}

export class TerminalSession implements IDisposable {
  private disposed = false
  private readonly previousEcho: boolean
  private readonly previousSignalInterrupt: boolean
  private readonly bracketedPaste: boolean

  constructor(
    readonly term: Term,
    {
      bracketedPaste = true,
      interruptAsInput = true,
      interceptBrowserShortcuts = true,
    }: TerminalSessionOptions = {},
  ) {
    if (activeTerms.has(term)) throw new Error('Terminal already has an active full-screen session')
    activeTerms.add(term)

    this.previousEcho = term.doEcho
    this.previousSignalInterrupt = term.signalInterrupt
    this.bracketedPaste = bracketedPaste
    term.doEcho = false
    term.signalInterrupt = ! interruptAsInput
    try {
      if (interceptBrowserShortcuts) {
        term.setApplicationKeyHandler(interceptApplicationShortcut)
      }
      term.write(
        ENTER_ALTERNATE_SCREEN
        + DISABLE_AUTOWRAP
        + (bracketedPaste ? ENABLE_BRACKETED_PASTE : '')
        + CLEAR_SCREEN,
      )
    }
    catch (error) {
      term.setApplicationKeyHandler(null)
      term.doEcho = this.previousEcho
      term.signalInterrupt = this.previousSignalInterrupt
      activeTerms.delete(term)
      throw error
    }
  }

  onResize(listener: (size: { rows: number, cols: number }) => void) {
    return this.term.onResize(listener)
  }

  write(data: string) {
    if (this.disposed) throw new Error('Terminal session is already disposed')
    this.term.write(data)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    try {
      this.term.write(
        (this.bracketedPaste ? DISABLE_BRACKETED_PASTE : '')
        + ENABLE_AUTOWRAP
        + SHOW_CURSOR
        + LEAVE_ALTERNATE_SCREEN,
      )
    }
    finally {
      this.term.setApplicationKeyHandler(null)
      this.term.doEcho = this.previousEcho
      this.term.signalInterrupt = this.previousSignalInterrupt
      activeTerms.delete(this.term)
    }
  }
}
