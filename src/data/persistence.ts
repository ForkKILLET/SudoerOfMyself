import { Inode } from '@/sys0/fs'

export interface PersistenceData {
    'fs:initialized':       boolean
    [k: `i:${number}`]:     Inode
}

export type PersistenceKey = keyof PersistenceData