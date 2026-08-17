import { Pred } from '@/utils/types'
import { NormalFile, FRead, FWrite, FReadWrite, Inode } from '.'
import { Context } from '../context'

export type FileModeWritable = 'w' | 'a' | 'rw' | 'ra'
export type FileMode = 'r' | FileModeWritable

export abstract class FileHandle {
  constructor(public ctx: Context, protected inode: Inode<NormalFile>) {}

  abstract readonly mode: FileMode

  protected cursor = 0

  protected get isAtEof() {
    return this.cursor >= this.inode.file.content.length
  }

  protected get currentChar() {
    return this.inode.file.content[this.cursor]
  }

  protected readCharAtCursor() {
    if (this.isAtEof) return '\x04'
    const char = this.currentChar
    this.cursor ++
    return char
  }

  protected readUntilAtCursor(pred: Pred<string>) {
    const start = this.cursor
    while (! (this.isAtEof || pred(this.currentChar))) this.cursor ++
    return this.inode.file.content.slice(start, this.cursor)
  }

  protected sync() {
    this.ctx.fs.persistence.set(this.inode.iid, this.inode)
  }

  protected rewrite(data: string) {
    this.inode.file.content = data
    this.sync()
  }

  protected append(data: string) {
    this.inode.file.content += data
    this.sync()
  }
}

export type FileHandleFromMode<FM extends FileMode> =
  FM extends 'r' ? FileHandleR :
    FM extends 'w' ? FileHandleW :
      FM extends 'a' ? FileHandleA :
        FM extends 'rw' ? FileHandleRW :
          FM extends 'ra' ? FileHandleRA :
            never

export abstract class FileHandleReadable extends FileHandle implements FRead {
  readChar() {
    return this.readCharAtCursor()
  }

  readKey() {
    return this.readCharAtCursor()
  }

  readUntil(pred: Pred<string>) {
    return this.readUntilAtCursor(pred)
  }

  read() {
    return this.readUntil(() => false)
  }

  readLn() {
    return this.readUntil(char => char === '\n')
  }
}

export class FileHandleR extends FileHandleReadable {
  readonly mode = 'r' as const
}

export abstract class FileHandleWritable extends FileHandle implements FWrite {
  abstract readonly mode: FileModeWritable

  override rewrite(data: string) {
    super.rewrite(data)
  }

  rewriteLn(data: string) {
    this.rewrite(data + '\n')
  }

  override append(data: string) {
    super.append(data)
  }

  appendLn(data: string) {
    this.append(data + '\n')
  }

  write(data: string) {
    if (this.mode.endsWith('a')) this.append(data)
    else this.rewrite(data)
  }

  writeLn(data: string) {
    this.write(data + '\n')
  }
}

export class FileHandleW extends FileHandleWritable {
  readonly mode = 'w' as const
}

export class FileHandleA extends FileHandleWritable {
  readonly mode = 'a' as const
}

abstract class FileHandleReadWrite extends FileHandleWritable implements FReadWrite {
  readKey() {
    return this.readCharAtCursor()
  }

  readUntil(pred: Pred<string>) {
    return this.readUntilAtCursor(pred)
  }

  read() {
    return this.readUntil(() => false)
  }

  readLn() {
    return this.readUntil(char => char === '\n')
  }
}

export class FileHandleRW extends FileHandleReadWrite {
  readonly mode = 'rw' as const
}

export class FileHandleRA extends FileHandleReadWrite {
  readonly mode = 'ra' as const
}

export const FILE_HANDLE_FROM_MODE = {
  r: FileHandleR,
  w: FileHandleW,
  a: FileHandleA,
  rw: FileHandleRW,
  ra: FileHandleRA,
}
