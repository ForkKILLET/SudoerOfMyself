import stripAnsi from 'strip-ansi'
import stringWidth from 'string-width'
import { Terminal, ITerminalOptions, ITerminalInitOnlyOptions } from '@xterm/xterm'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { WebglAddon } from '@xterm/addon-webgl'
import { Emitter, Events } from '@/utils/emitter'
import { IDisposable } from '@/utils/disposable'
import { RemoveIndex } from '@/utils/types'
import { handleTerminalCopyShortcut } from './terminal_shortcuts'
import { DEFAULT_TERMINAL_SIZE } from './terminal_size'

export interface TerminalEvents extends Events {
  data: [ string ]
  interrupt: []
}

export type TermOptions = ITerminalOptions & ITerminalInitOnlyOptions & {
  useWebglAddon?: boolean
}

export class Term extends Terminal {
  private readonly events = new Emitter<TerminalEvents>()
  private applicationKeyHandler: ((event: KeyboardEvent) => boolean) | null = null

  doEcho = true
  signalInterrupt = true

  constructor({ useWebglAddon = true, ...options }: TermOptions = {}) {
    super({
      ...DEFAULT_TERMINAL_SIZE,
      fontFamily: `'Fira Code', 'Jetbrains Mono', 'Consolas', monospace`,
      allowProposedApi: true,
      cursorBlink: true,
      ...options,
    })

    this.loadAddon(new Unicode11Addon())
    this.unicode.activeVersion = '11'

    if (useWebglAddon) {
      const webglAddon = new WebglAddon()
      webglAddon.onContextLoss(() => {
        webglAddon.dispose()
      })
      this.loadAddon(webglAddon)
    }

    this.attachCustomKeyEventHandler((event) => {
      if (! handleTerminalCopyShortcut(event, () => this.getSelection())) return false
      return this.applicationKeyHandler?.(event) ?? true
    })

    this.onData((data) => {
      if (this.doEcho) {
        this.write(this.escape(data))
      }

      if (data === '\x03' && this.signalInterrupt) { // Ctrl+C
        this.emit('interrupt')
        return
      }

      this.emit('data', data)
    })
  }

  on<K extends keyof RemoveIndex<TerminalEvents>>(
    event: K,
    listener: (...data: TerminalEvents[K]) => void,
    option?: { once?: boolean },
  ): IDisposable {
    return this.events.on(event, listener, option)
  }

  off<K extends keyof RemoveIndex<TerminalEvents>>(
    event: K,
    listener: (...data: TerminalEvents[K]) => void,
  ) {
    this.events.off(event, listener)
  }

  emit<K extends keyof RemoveIndex<TerminalEvents>>(event: K, ...data: TerminalEvents[K]) {
    this.events.emit(event, ...data)
  }

  setApplicationKeyHandler(handler: ((event: KeyboardEvent) => boolean) | null) {
    if (handler && this.applicationKeyHandler) {
      throw new Error('Terminal application key handler is already active')
    }
    this.applicationKeyHandler = handler
  }

  getStringWidth(str: string) {
    return stringWidth(stripAnsi(str))
  }

  escape(str: string) {
    return str
      .replace(/[\x00-\x1F]/g, (char) => {
        if (char === '\x04') return ''
        if (char === '\r') return '\r\n'
        else return `^${String.fromCharCode(char.charCodeAt(0) + 64)}`
      })
      .replace(/\x7F/g, '\b \b')
  }
}
