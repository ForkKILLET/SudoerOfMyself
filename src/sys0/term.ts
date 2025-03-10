import stripAnsi from 'strip-ansi'
import { Terminal, ITerminalOptions, ITerminalInitOnlyOptions } from '@xterm/xterm'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { WebglAddon } from '@xterm/addon-webgl'
import { Emitter, Events } from '@/utils/emitter'
import { mixin } from '@/utils'

export interface TerminalEvents extends Events {
    'data': [ string ]
    'interrupt': []
}

export interface Term extends Emitter<TerminalEvents> {}

export class Term extends Terminal {
    static {
        mixin(this, Emitter)
    }

    doEcho = true

    constructor(options?: ITerminalOptions & ITerminalInitOnlyOptions) {
        super({
            rows: 30,
            cols: 97,
            fontFamily: `'Fira Code', 'Jetbrains Mono', 'Consolas', monospace`,
            allowProposedApi: true,
            cursorBlink: true,
            ...options
        })

        this.initEmitter()

        this.loadAddon(new Unicode11Addon())
        this.unicode.activeVersion = '11'

        const webglAddon = new WebglAddon()
        webglAddon.onContextLoss(() => {
            webglAddon.dispose()
        })
        this.loadAddon(webglAddon)

        this.onData(data => {
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

    getCharWidth(char: string) {
        return this._core.unicodeService._activeProvider.wcwidth(char.charCodeAt(0))
    }

    getStringWidth(str: string) {
        return [ ...stripAnsi(str) ].map(char => this.getCharWidth(char)).sum()
    }

    escape(str: string) {
        return str
            .replace(/[\x00-\x1F]/g, char => {
                if (char === '\x04') return ''
                if (char === '\r') return '\r\n'
                else return `^${String.fromCharCode(char.charCodeAt(0) + 64)}`
            })
    }
}