import { IDisposable } from './disposable'
import { RemoveIndex } from './types'

export interface Events {
  [event: string]: unknown[]
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
    const listeners = this.listeners[event]
    if (! listeners) return

    const index = listeners.indexOf(listener)
    if (index !== - 1) listeners.splice(index, 1)
  }

  emit<K extends keyof RemoveIndex<M>>(event: K, ...data: M[K]) {
    this.listeners[event]?.slice().forEach(listener => listener(...data))
  }
}
