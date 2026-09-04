import { describe, expect, it } from 'vitest'
import type { FRead } from '@/sys0/fs'
import { EditorInputDecoder } from '@/programs/editor/input'

class ChunkInput implements FRead {
  constructor(private readonly chunks: string[]) {}

  readKey() {
    const chunk = this.chunks.shift()
    if (chunk === undefined) throw new Error('Unexpected input read')
    return chunk
  }

  read() { return '' }
  readUntil() { return '' }
  readLn() { return '' }
}

describe('editor input decoder', () => {
  it('separates text, terminal key sequences, and control keys from one chunk', async () => {
    const decoder = new EditorInputDecoder(new ChunkInput(['a你\x1B[A\x0F']))

    await expect(decoder.read()).resolves.toEqual({ type: 'text', value: 'a你' })
    await expect(decoder.read()).resolves.toEqual({ type: 'key', key: 'up' })
    await expect(decoder.read()).resolves.toEqual({ type: 'key', key: 'ctrl-o' })
  })

  it('collects bracketed paste split across input chunks', async () => {
    const decoder = new EditorInputDecoder(new ChunkInput([
      '\x1B[200~hello',
      '\r',
      '世界\x1B[201~',
    ]))

    await expect(decoder.read()).resolves.toEqual({
      type: 'paste',
      value: 'hello\n世界',
    })
  })

  it('reports unknown escape sequences without inserting their bytes as text', async () => {
    const decoder = new EditorInputDecoder(new ChunkInput(['\x1B[9~']))

    await expect(decoder.read()).resolves.toEqual({
      type: 'key',
      key: 'sequence:\x1B[9~',
    })
  })

  it('decodes Meta shortcuts and word/file navigation without inserting text', async () => {
    const decoder = new EditorInputDecoder(new ChunkInput([
      '\x1Bu\x1Be\x1B6\x1B[1;5C\x1B[1;5D\x1B[1;5H\x1B[1;5F\x1E\x1F',
    ]))
    for (const key of [
      'alt-u',
      'alt-e',
      'alt-6',
      'word-right',
      'word-left',
      'file-start',
      'file-end',
      'ctrl-6',
      'ctrl-_',
    ]) {
      await expect(decoder.read()).resolves.toEqual({ type: 'key', key })
    }
  })
})
