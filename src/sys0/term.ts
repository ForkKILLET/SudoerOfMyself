import stripAnsi from 'strip-ansi'
import stringWidth from 'string-width'
import { Terminal, ITerminalOptions, ITerminalInitOnlyOptions } from '@xterm/xterm'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { WebglAddon } from '@xterm/addon-webgl'
import { Emitter, Events } from '@/utils/emitter'
import { IDisposable } from '@/utils/disposable'
import { RemoveIndex } from '@/utils/types'

export interface TerminalEvents extends Events {
  data: [ string ]
  interrupt: []
}

export class Term extends Terminal {
  private readonly events = new Emitter<TerminalEvents>()

  doEcho = true

  constructor(options?: ITerminalOptions & ITerminalInitOnlyOptions) {
    super({
      rows: 30,
      cols: 97,
      fontFamily: `'Fira Code', 'Jetbrains Mono', 'Consolas', monospace`,
      allowProposedApi: true,
      cursorBlink: true,
      ...options,
    })

    this.loadAddon(new Unicode11Addon())
    this.unicode.activeVersion = '11'

    const webglAddon = new WebglAddon()
    webglAddon.onContextLoss(() => {
      webglAddon.dispose()
    })
    this.loadAddon(webglAddon)

    this.onData((data) => {
      if (this.doEcho) {
        this.write(this.escape(data))
      }

      if (data === '\x03') { // Ctrl+C
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
