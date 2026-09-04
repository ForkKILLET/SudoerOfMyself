import type { FRead, FReadKeyOptions } from '@/sys0/fs'

export type EditorKey =
  | 'backspace'
  | 'delete'
  | 'down'
  | 'end'
  | 'enter'
  | 'escape'
  | 'home'
  | 'left'
  | 'page-down'
  | 'page-up'
  | 'right'
  | 'shift-tab'
  | 'tab'
  | 'up'
  | `ctrl-${string}`
  | `sequence:${string}`

export type EditorInput =
  | { type: 'key', key: EditorKey }
  | { type: 'paste', value: string }
  | { type: 'text', value: string }

const BRACKETED_PASTE_BEGIN = '\x1B[200~'
const BRACKETED_PASTE_END = '\x1B[201~'

const ESCAPE_SEQUENCES: ReadonlyArray<readonly [string, EditorKey]> = [
  ['\x1B[1;5A', 'up'],
  ['\x1B[1;5B', 'down'],
  ['\x1B[1;5C', 'right'],
  ['\x1B[1;5D', 'left'],
  ['\x1B[5~', 'page-up'],
  ['\x1B[6~', 'page-down'],
  ['\x1B[3~', 'delete'],
  ['\x1B[1~', 'home'],
  ['\x1B[4~', 'end'],
  ['\x1B[H', 'home'],
  ['\x1B[F', 'end'],
  ['\x1BOH', 'home'],
  ['\x1BOF', 'end'],
  ['\x1B[A', 'up'],
  ['\x1B[B', 'down'],
  ['\x1B[C', 'right'],
  ['\x1B[D', 'left'],
  ['\x1B[Z', 'shift-tab'],
]

const normalizePastedText = (value: string) => value.replace(/\r\n?|\n/gu, '\n')

const controlKey = (char: string): EditorKey | undefined => {
  const code = char.charCodeAt(0)
  if (code >= 1 && code <= 26) return `ctrl-${String.fromCharCode(code + 96)}`
  return undefined
}

export class EditorInputDecoder {
  private readonly pending: EditorInput[] = []
  private paste: string | null = null

  constructor(private readonly input: FRead) {}

  private consumePaste(data: string) {
    const end = data.indexOf(BRACKETED_PASTE_END)
    if (end === - 1) {
      this.paste = (this.paste ?? '') + data
      return ''
    }
    const pasted = (this.paste ?? '') + data.slice(0, end)
    this.pending.push({ type: 'paste', value: normalizePastedText(pasted) })
    this.paste = null
    return data.slice(end + BRACKETED_PASTE_END.length)
  }

  private consume(data: string) {
    if (this.paste !== null) data = this.consumePaste(data)

    let index = 0
    while (index < data.length) {
      if (data.startsWith(BRACKETED_PASTE_BEGIN, index)) {
        this.paste = ''
        data = this.consumePaste(data.slice(index + BRACKETED_PASTE_BEGIN.length))
        index = 0
        continue
      }

      const char = data[index]
      if (char === '\x1B') {
        const sequence = ESCAPE_SEQUENCES.find(([value]) => data.startsWith(value, index))
        if (sequence) {
          this.pending.push({ type: 'key', key: sequence[1] })
          index += sequence[0].length
          continue
        }
        const unknown = /^(\x1B(?:\[[0-9;?]*[ -/]*[@-~]|O.))/u.exec(data.slice(index))?.[1]
        if (unknown) {
          this.pending.push({ type: 'key', key: `sequence:${unknown}` })
          index += unknown.length
          continue
        }
        this.pending.push({ type: 'key', key: 'escape' })
        index ++
        continue
      }
      if (char === '\r' || char === '\n') {
        this.pending.push({ type: 'key', key: 'enter' })
        index ++
        continue
      }
      if (char === '\t') {
        this.pending.push({ type: 'key', key: 'tab' })
        index ++
        continue
      }
      if (char === '\x7F' || char === '\x08') {
        this.pending.push({ type: 'key', key: 'backspace' })
        index ++
        continue
      }
      const control = controlKey(char)
      if (control) {
        this.pending.push({ type: 'key', key: control })
        index ++
        continue
      }
      if (char.charCodeAt(0) < 32) {
        this.pending.push({ type: 'key', key: `sequence:${char}` })
        index ++
        continue
      }

      const begin = index
      while (index < data.length) {
        const next = data[index]
        if (next === '\x1B' || next === '\r' || next === '\n' || next === '\t') break
        if (next === '\x7F' || next.charCodeAt(0) < 32) break
        index ++
      }
      this.pending.push({ type: 'text', value: data.slice(begin, index) })
    }
  }

  async read(options?: FReadKeyOptions): Promise<EditorInput> {
    while (! this.pending.length) this.consume(await this.input.readKey(options))
    return this.pending.shift() !
  }
}
