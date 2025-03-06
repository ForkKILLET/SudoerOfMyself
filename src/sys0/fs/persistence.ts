import { IStorage } from '@/utils/types'
import { Inode } from '.'

export interface FsPersistence extends IStorage<number, Inode> {
    isInitialized: boolean
}

export class LocalStorageFsPersistence implements FsPersistence {
    get isInitialized() {
        return localStorage.getJsonOr('fs:initialized', false)
    }
    set isInitialized(value: boolean) {
        localStorage.setJson('fs:initialized', value)
    }

    get(iid: number) {
        return localStorage.getJson(`i:${iid}`)!
    }

    getAll() {
        return Object.entries(localStorage)
            .filter(([ key ]) => key.startsWith('i:'))
            .map(([ key, value ]) => [ parseInt(key.slice(2)), JSON.parse(value) ] as [ number, Inode ])
    }

    set(iid: number, inode: Inode) {
        localStorage.setJson(`i:${iid}`, inode)
    }
}