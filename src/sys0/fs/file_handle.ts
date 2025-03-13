import { mixin } from '@/utils'
import { Pred } from '@/utils/types'
import { NormalFile, FRead, FReadKeyOptions, FWrite, FReadWrite, Inode } from '.'
import { Context } from '../context'

export type FileModeWritable = 'w' | 'a' | 'rw' | 'ra'
export type FileMode = 'r' | FileModeWritable

export abstract class FileHandle {
    constructor(public ctx: Context, protected inode: Inode<NormalFile>) {}

    abstract readonly mode: FileMode

    protected cursor = 0

    get isAtEof() {
        return this.cursor >= this.inode.file.content.length
    }

    get currentChar() {
        return this.inode.file.content[this.cursor]
    }
}

export type FileHandleFromMode<FM extends FileMode> =
    FM extends 'r' ? FileHandleR :
    FM extends 'w' ? FileHandleW :
    FM extends 'a' ? FileHandleA :
    FM extends 'rw' ? FileHandleRW :
    FM extends 'ra' ? FileHandleRA :
    never

export class FileHandleR extends FileHandle implements FRead {
    readonly mode: FileMode = 'r'

    readChar() {
        if (this.isAtEof) return '\x04'
        const char = this.currentChar
        this.cursor ++
        return char
    }
    readKey({}: FReadKeyOptions) {
        return this.readChar()
    }
    readUntil(pred: Pred<string>) {
        let start = this.cursor
        while (! (this.isAtEof || pred(this.currentChar))) this.cursor ++
        return this.inode.file.content.slice(start, this.cursor)
    }

    read() {
        return this.readUntil(() => false)
    }
    readLn() {
        return this.readUntil(char => char === '\n')
    }
}

export abstract class FileHandleWritable extends FileHandle implements FWrite {
    abstract readonly mode: FileModeWritable

    sync() {
        this.ctx.fs.persistence.set(this.inode.iid, this.inode)
    }

    write(data: string) {
        if (this.mode.endsWith('a')) this.append(data)
        else this.rewrite(data)
    }
    writeLn(data: string) {
        this.write(data + '\n')
    }

    rewrite(data: string) {
        this.inode.file.content = data
        this.sync()
    }
    rewriteLn(data: string) {
        this.rewrite(data + '\n')
    }

    append(data: string) {
        this.inode.file.content += data
        this.sync()
    }
    appendLn(data: string) {
        this.append(data + '\n')
    }
}

export class FileHandleW extends FileHandleWritable implements FWrite {
    static {
        mixin(this, FileHandleWritable)
    }

    readonly mode: FileModeWritable = 'w'
}

export class FileHandleA extends FileHandleWritable implements FWrite {
    static {
        mixin(this, FileHandleWritable)
    }

    readonly mode: FileModeWritable = 'a'
}

export interface FileHandleRW extends Omit<FileHandleR, 'mode'>, Omit<FileHandleW, 'mode'> {}
export class FileHandleRW extends FileHandle implements FReadWrite {
    static {
        mixin(this, FileHandleR)
        mixin(this, FileHandleW)
    }

    readonly mode: FileMode = 'rw'
}

export interface FileHandleRA extends Omit<FileHandleR, 'mode'>, Omit<FileHandleW, 'mode'> {}
export class FileHandleRA extends FileHandle implements FReadWrite {
    static {
        mixin(this, FileHandleR)
        mixin(this, FileHandleA)
    }

    readonly mode: FileMode = 'ra'
}

export const FILE_HANDLE_FROM_MODE = {
    r: FileHandleR,
    w: FileHandleW,
    a: FileHandleA,
    rw: FileHandleRW,
    ra: FileHandleRA,
}