import { describe, expect, it, vi } from 'vitest'
import { FRead, FWrite } from '@/sys0/fs'
import { FdTable, OpenFileDescription } from '@/sys0/fd'

class MemoryStream implements FRead, FWrite {
  cursor = 0
  content = ''

  readKey() {
    if (this.cursor >= this.content.length) return '\x04'
    return this.content[this.cursor ++]
  }

  read() {
    const data = this.content.slice(this.cursor)
    this.cursor = this.content.length
    return data
  }

  readUntil() { return this.read() }
  readLn() { return this.read() }
  write(data: string) { this.content += data }
  writeLn(data: string) { this.write(data + '\n') }
}

describe('file descriptor table', () => {
  it('allocates the lowest available descriptor and reports bad descriptors', () => {
    const table = new FdTable()
    const first = table.open({ readable: new MemoryStream() }).unwrap()
    const second = table.open({ writable: new MemoryStream() }).unwrap()

    expect([first, second]).toEqual([0, 1])
    table.close(first).unwrap()
    expect(table.open({ readable: new MemoryStream() }).unwrap()).toBe(0)
    const missing = table.get(9)
    expect(missing.isErr && missing.err).toEqual({ type: 'bad-file-descriptor', fd: 9 })
  })

  it('shares open-file descriptions across dup and fork until the last close', () => {
    const close = vi.fn()
    const description = new OpenFileDescription({ writable: new MemoryStream(), close })
    const table = new FdTable()
    table.set(1, description).unwrap()
    table.duplicate(1, 4).unwrap()
    const child = table.fork()

    expect(description.references).toBe(4)
    table.close(1).unwrap()
    table.close(4).unwrap()
    expect(close).not.toHaveBeenCalled()
    child.closeAll()
    expect(close).toHaveBeenCalledOnce()
    expect(description.isClosed).toBe(true)
  })

  it('replaces a descriptor without affecting aliases of its old description', () => {
    const oldClose = vi.fn()
    const oldDescription = new OpenFileDescription({ readable: new MemoryStream(), close: oldClose })
    const table = new FdTable()
    table.set(0, oldDescription).unwrap()
    table.duplicate(0, 3).unwrap()

    table.replace(0, { readable: new MemoryStream() }).unwrap()
    expect(oldClose).not.toHaveBeenCalled()
    table.close(3).unwrap()
    expect(oldClose).toHaveBeenCalledOnce()
  })

  it('can close an unopened valid descriptor without hiding invalid numbers', () => {
    const table = new FdTable()

    expect(table.closeIfOpen(8).isOk).toBe(true)
    expect(table.closeIfOpen(- 1).isErr).toBe(true)
  })
})
