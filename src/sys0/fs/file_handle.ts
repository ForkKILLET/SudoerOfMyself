import { Pred } from '@/utils/types'
import { NormalFile, FRead, FWrite, FReadWrite, Inode } from '.'

export interface FileHandlePersistence {
  set(iid: number, inode: Inode): void
}

export type FileModeWritable = 'w' | 'a' | 'rw' | 'ra'
export type FileMode = 'r' | FileModeWritable

export abstract class FileHandle {
  constructor(
    private readonly persistence: FileHandlePersistence,
    protected inode: Inode<NormalFile>,
  ) {}

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
    while (! this.isAtEof) {
      if (pred(this.currentChar)) {
        const end = this.cursor
        this.cursor ++
        return this.inode.file.content.slice(start, end)
      }
      this.cursor ++
    }
    return this.inode.file.content.slice(start)
  }

  protected sync() {
    this.persistence.set(this.inode.iid, this.inode)
  }

  protected rewrite(data: string) {
    this.inode.file.content = data
    this.cursor = data.length
    this.sync()
  }

  protected append(data: string) {
    this.inode.file.content += data
    this.cursor = this.inode.file.content.length
    this.sync()
  }

  protected writeAtCursor(data: string) {
    const content = this.inode.file.content
    this.inode.file.content = content.slice(0, this.cursor) + data + content.slice(this.cursor + data.length)
    this.cursor += data.length
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
    else this.writeAtCursor(data)
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
