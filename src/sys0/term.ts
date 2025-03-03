import { Terminal, ITerminalOptions, ITerminalInitOnlyOptions } from '@xterm/xterm'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { WebglAddon } from '@xterm/addon-webgl'
import { Emitter, Events, mixEmitter } from '@/utils/emitter'

export interface TerminalEvents extends Events {
    'data': [ string ]
    'interrupt': []
}

export interface Term extends Emitter<TerminalEvents> {}

export class Term extends Terminal {
    constructor(options?: ITerminalOptions & ITerminalInitOnlyOptions) {
        super({
            rows: 30,
            cols: 97,
            fontFamily: `'Fira Code', 'Jetbrains Mono', 'Consolas', monospace`,
            allowProposedApi: true,
            cursorBlink: true,
            ...options
        })

        this.loadAddon(new Unicode11Addon())
        this.unicode.activeVersion = '11'

        const webglAddon = new WebglAddon()
        webglAddon.onContextLoss(() => {
            webglAddon.dispose()
        })
        this.loadAddon(webglAddon)

        mixEmitter(this)

        this.onData(data => {
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
        return [...str].map(char => this.getCharWidth(char)).sum()
    }
}