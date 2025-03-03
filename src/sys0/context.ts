import { Emitter, Events } from '@/utils/emitter'
import { Process } from './proc'
import { Term } from './term'
import { FS } from './fs'

export interface ContextEvents extends Events { 
    'term-data': [ string ]
}

export class Context extends Emitter<ContextEvents> {
    term: Term
    init: Process
    fs: FS
    fgProc: Process

    constructor() {
        super()

        this.term = new Term()
        this.fs = new FS(this)
        this.fgProc = this.init = new Process(this, null, 'init', '/', {
            PWD: '/home',
            HOME: '/home',
            PATH: '/bin',
        })

        this.term.on('interrupt', () => {
            this.fgProc.emit('interrupt')
        })
    }

    attach(element: HTMLElement) {
        this.term.open(element)
    }
}