import { Emitter, Events } from '@/utils/emitter'
import { Process } from './proc'
import { Term } from './term'
import { Fs } from './fs'

export interface ContextEvents extends Events { 
    'term-data': [ string ]
}

export class Context extends Emitter<ContextEvents> {
    term: Term
    init: Process
    fs: Fs
    fgProc: Process

    constructor() {
        super()

        this.term = new Term()
        this.fs = new Fs(this)
        this.fgProc = this.init = new Process(this, null, {
            name: 'init',
            env: {
                PWD: '/home',
                HOME: '/home',
                PATH: '/bin',
            }
        })

        this.term.on('interrupt', () => {
            this.fgProc.emit('interrupt')
        })
    }

    attach(element: HTMLElement) {
        this.term.open(element)
    }
}