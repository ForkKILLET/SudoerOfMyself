import { Nullable } from './types'

export type IDisposable = {
    dispose: () => void
}

export namespace Disposable {
    export const combine = (...disposables: Nullable<IDisposable>[]): IDisposable => ({
        dispose: () => disposables.forEach(disposable => disposable?.dispose())
    })
}