import { IDisposable } from '@xterm/xterm'
import { RemoveIndex } from './types'

export interface Events {
    [event: string]: any[]
}

export interface Emitter<M extends Events> {
    on<K extends keyof RemoveIndex<M>>(event: K, listener: (...data: M[K]) => void, option?: {
        once?: boolean
    }): IDisposable

    off<K extends keyof RemoveIndex<M>>(event: K, listener: (...data: M[K]) => void): void

    emit<K extends keyof RemoveIndex<M>>(event: K, ...data: M[K]): void
}

export class Emitter<M extends Events> {
    private listeners: { [K in keyof M]?: Array<(...data: M[K]) => void> } = {}

    on<K extends keyof RemoveIndex<M>>(event: K, listener: (...data: M[K]) => void, option?: {
        once?: boolean
    }): IDisposable {
        const realListener = (...data: M[K]) => {
            listener(...data)
            if (option?.once) dispose()
        }
        const dispose = () => this.off(event, realListener)
        void (this.listeners[event] ??= []).push(realListener)
        return { dispose }
    }

    off<K extends keyof RemoveIndex<M>>(event: K, listener: (...data: M[K]) => void) {
        if (! this.listeners[event]) return
        this.listeners[event].eraseOne(listener)
    }

    emit<K extends keyof RemoveIndex<M>>(event: K, ...data: M[K]) {
        this.listeners[event]?.forEach(listener => listener(...data))
    }
}

export const mixEmitter = <M extends Events, T extends Emitter<M>>(target: T) => {
    const emitter = new Emitter<M>()
    target.on = emitter.on.bind(emitter)
    target.off = emitter.off.bind(emitter)
    target.emit = emitter.emit.bind(emitter)
    return target
}