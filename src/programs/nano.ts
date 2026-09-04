import { FOp } from '@/sys0/fs'
import { Path } from '@/sys0/fs/path'
import { createCommand } from '@/sys0/program'
import { signalExit, type ProcessSignal } from '@/sys0/process_exit'
import type { Process } from '@/sys0/proc'
import { TerminalSession } from '@/sys0/terminal_session'
import { errorMessage, UserError } from '@/utils/errors'
import { EditorInputDecoder, type EditorInput } from './editor/input'
import { NANO_EXIT_SHORTCUTS, NANO_SEARCH_SHORTCUTS } from './editor/nano_help'
import {
  EditorRenderer,
  type EditorFooter,
  type EditorNotice,
  type EditorPrompt,
} from './editor/renderer'
import { TextBuffer, type EditorCursor, type TextRange } from './editor/text_buffer'

const MAX_FILE_SIZE = 2 * 1024 * 1024
const SEARCH_HIGHLIGHT_MS = 2_500

type ExitDecision = 'cancel' | 'discard' | 'save'

class NanoEditor {
  private readonly buffer: TextBuffer
  private readonly input: EditorInputDecoder
  private readonly renderer: EditorRenderer
  private readonly abortController = new AbortController()
  private receivedSignal: ProcessSignal | undefined
  private filename: string | undefined
  private savedContent: string
  private cutBuffer = ''
  private message = ''
  private notice: EditorNotice | undefined
  private activePrompt: EditorPrompt | undefined
  private activeFooter: EditorFooter | undefined
  private showingHelp = false
  private searchQuery = ''
  private searchHighlight: TextRange | undefined
  private searchHighlightTimer: ReturnType<typeof setTimeout> | undefined
  private consecutiveCut = false
  private mark: EditorCursor | undefined

  constructor(
    private readonly proc: Process,
    private readonly session: TerminalSession,
    filename: string | undefined,
    content: string,
  ) {
    this.filename = filename
    this.buffer = new TextBuffer(content)
    this.savedContent = content
    this.input = new EditorInputDecoder(proc.stdio.input)
    this.renderer = new EditorRenderer(session, this.buffer)
  }

  private get modified() {
    return this.buffer.content !== this.savedContent
  }

  redraw() {
    this.session.setPageLeaveGuard(this.modified)
    this.renderer.render({
      filename: this.filename,
      message: this.message,
      modified: this.modified,
      prompt: this.activePrompt,
      help: this.showingHelp,
      notice: this.notice,
      searchHighlight: this.searchHighlight,
      selection: this.mark ? this.buffer.rangeFrom(this.mark) : undefined,
      footer: this.activeFooter,
    })
  }

  private async readInput() {
    const input = await this.input.read({ signal: this.abortController.signal })
    return this.receivedSignal ? null : input
  }

  private async prompt(
    label: string,
    initial = '',
    options: Pick<
      EditorPrompt,
      'shortcuts' | 'shortcutColumns' | 'shortcutColumnWidth' | 'shortcutPairs'
    > = {},
  ): Promise<string | null> {
    let characters = Array.from(initial)
    let cursor = characters.length
    try {
      while (true) {
        this.activePrompt = {
          label,
          value: characters.join(''),
          cursor: characters.slice(0, cursor).join('').length,
          ...options,
        }
        this.redraw()
        const input = await this.readInput()
        if (! input) return null
        if (input.type === 'text' || input.type === 'paste') {
          const inserted = Array.from(input.value.replace(/[\r\n]/gu, ''))
          characters.splice(cursor, 0, ...inserted)
          cursor += inserted.length
        }
        else switch (input.key) {
          case 'left':
          case 'ctrl-b':
            cursor = Math.max(0, cursor - 1)
            break
          case 'right':
          case 'ctrl-f':
            cursor = Math.min(characters.length, cursor + 1)
            break
          case 'home':
          case 'ctrl-a':
            cursor = 0
            break
          case 'end':
          case 'ctrl-e':
            cursor = characters.length
            break
          case 'backspace':
            if (cursor) characters.splice(-- cursor, 1)
            break
          case 'delete':
          case 'ctrl-d':
            characters.splice(cursor, 1)
            break
          case 'ctrl-u':
            characters = []
            cursor = 0
            break
          case 'ctrl-g':
            await this.showHelp()
            break
          case 'enter': return characters.join('')
          case 'escape':
          case 'ctrl-c': return null
        }
      }
    }
    finally {
      this.activePrompt = undefined
    }
  }

  private async search() {
    const query = await this.prompt('Search: ', this.searchQuery, {
      shortcuts: NANO_SEARCH_SHORTCUTS,
      shortcutColumns: 1,
      shortcutPairs: true,
    })
    if (query === null) {
      this.message = 'Cancelled'
      return
    }
    const selected = query || this.searchQuery
    const changed = selected !== this.searchQuery
    this.searchQuery = selected
    this.findNext(changed)
  }

  private findNext(includeCurrent = false) {
    if (! this.searchQuery) {
      this.message = 'No search text; use ^F to search'
      return
    }
    const result = this.buffer.findNext(this.searchQuery, includeCurrent)
    this.message = ''
    if (! result) {
      this.notice = { text: `[ "${this.searchQuery}" not found ]`, tone: 'error' }
      return
    }
    this.notice = result.wrapped ? { text: '[ Search Wrapped ]', tone: 'wrapped' } : undefined
    this.showSearchHighlight(result.range)
  }

  private showSearchHighlight(range: TextRange) {
    this.clearSearchHighlight()
    this.searchHighlight = range
    this.searchHighlightTimer = setTimeout(() => {
      this.searchHighlight = undefined
      this.searchHighlightTimer = undefined
      this.redraw()
    }, SEARCH_HIGHLIGHT_MS)
  }

  private clearSearchHighlight() {
    if (this.searchHighlightTimer !== undefined) clearTimeout(this.searchHighlightTimer)
    this.searchHighlightTimer = undefined
    this.searchHighlight = undefined
  }

  private async goTo() {
    const value = await this.prompt('Go to line,column: ')
    if (value === null) {
      this.message = 'Cancelled'
      return
    }
    const match = /^(\d+)(?:[, :](\d+))?$/u.exec(value.trim())
    const row = Number(match?.[1])
    const column = Number(match?.[2] ?? '1')
    if (! match || ! Number.isSafeInteger(row) || ! Number.isSafeInteger(column) || row < 1 || column < 1) {
      this.message = 'Enter a positive line number or line,column'
      return
    }
    this.buffer.moveTo(row - 1, column - 1)
    this.message = ''
  }

  private helpInput(input: EditorInput) {
    if (input.type !== 'key') return
    switch (input.key) {
      case 'ctrl-x':
      case 'ctrl-g':
      case 'ctrl-c':
      case 'escape':
        this.showingHelp = false
        break
      case 'up':
        this.renderer.scrollHelp(- 1)
        break
      case 'down':
        this.renderer.scrollHelp(1)
        break
      case 'page-up':
      case 'ctrl-y':
        this.renderer.scrollHelp(- this.renderer.pageRows)
        break
      case 'page-down':
      case 'ctrl-v':
        this.renderer.scrollHelp(this.renderer.pageRows)
        break
      case 'home':
        this.renderer.scrollHelp(- Number.MAX_SAFE_INTEGER)
        break
      case 'end':
        this.renderer.scrollHelp(Number.MAX_SAFE_INTEGER)
        break
    }
  }

  private async showHelp() {
    this.showingHelp = true
    this.renderer.scrollHelp(- Number.MAX_SAFE_INTEGER)
    try {
      while (this.showingHelp) {
        this.redraw()
        const input = await this.readInput()
        if (! input) return
        this.helpInput(input)
      }
    }
    finally {
      this.showingHelp = false
    }
  }

  private async confirmExit(): Promise<ExitDecision> {
    this.activeFooter = {
      shortcuts: NANO_EXIT_SHORTCUTS,
      shortcutColumns: 2,
      shortcutColumnWidth: 16,
      shortcutPairs: true,
    }
    try {
      while (true) {
        this.message = 'Save modified buffer?'
        this.redraw()
        const input = await this.readInput()
        if (! input) return 'cancel'
        if (input.type !== 'text') {
          if (input.type === 'key' && (input.key === 'ctrl-c' || input.key === 'escape')) {
            return 'cancel'
          }
          continue
        }
        const answer = input.value.toLowerCase()
        if (answer === 'y') return 'save'
        if (answer === 'n') return 'discard'
      }
    }
    finally {
      this.activeFooter = undefined
    }
  }

  private async writeOut() {
    const selected = await this.prompt('File Name to Write: ', this.filename ?? '')
    if (selected === null) {
      this.message = 'Cancelled'
      return false
    }
    if (! selected) {
      this.message = 'File name is required'
      return false
    }

    const filename = Path.resolve(selected, this.proc.cwd)
    const opened = this.proc.fs.open(filename, 'w', '/')
    if (opened.isErr) {
      this.message = `${filename}: ${FOp.displayError(opened.err)}`
      return false
    }
    opened.val.handle.write(this.buffer.content)
    try {
      await this.proc.fs.flush()
    }
    catch (error) {
      this.message = `Save failed: ${errorMessage(error)}`
      return false
    }
    this.filename = filename
    this.savedContent = this.buffer.content
    this.message = `Wrote ${this.buffer.lineCount} lines`
    return true
  }

  private edit(input: EditorInput, pageRows: number) {
    if (input.type === 'text' || input.type === 'paste') {
      this.mark = undefined
      this.buffer.insert(input.value)
      this.message = ''
      return
    }
    switch (input.key) {
      case 'left':
      case 'ctrl-b':
        this.buffer.moveLeft()
        break
      case 'right':
        this.buffer.moveRight()
        break
      case 'up':
      case 'ctrl-p':
        this.buffer.moveVertical(- 1)
        break
      case 'down':
      case 'ctrl-n':
        this.buffer.moveVertical(1)
        break
      case 'home':
      case 'ctrl-a':
        this.buffer.moveToLineStart()
        break
      case 'end':
      case 'ctrl-e':
        this.buffer.moveToLineEnd()
        break
      case 'page-up':
      case 'ctrl-y':
        this.buffer.moveVertical(- pageRows)
        break
      case 'page-down':
      case 'ctrl-v':
        this.buffer.moveVertical(pageRows)
        break
      case 'enter':
        this.mark = undefined
        this.buffer.insert('\n')
        break
      case 'tab':
        this.mark = undefined
        this.buffer.insert('\t')
        break
      case 'backspace':
        this.mark = undefined
        this.buffer.backspace()
        break
      case 'delete':
      case 'ctrl-d':
        this.mark = undefined
        this.buffer.deleteForward()
        break
      case 'file-start':
      case 'alt-<':
        this.buffer.moveToFileStart()
        break
      case 'file-end':
      case 'alt->':
        this.buffer.moveToFileEnd()
        break
      case 'word-left':
        this.buffer.moveWord(- 1)
        break
      case 'word-right':
        this.buffer.moveWord(1)
        break
      case 'ctrl-6':
      case 'alt-a':
        if (this.mark) {
          this.mark = undefined
          this.message = 'Mark unset'
        }
        else {
          this.mark = { ...this.buffer.cursor }
          this.message = 'Mark set'
        }
        break
      case 'ctrl-k': {
        const range = this.mark ? this.buffer.rangeFrom(this.mark) : undefined
        const cut = range ? this.buffer.cutRange(range) : this.buffer.cutLine()
        this.mark = undefined
        if (! cut && range) {
          this.consecutiveCut = false
          this.message = 'Nothing selected'
          break
        }
        this.cutBuffer = this.consecutiveCut ? this.cutBuffer + cut : cut
        this.consecutiveCut = true
        this.message = range ? 'Cut selection' : 'Cut line'
        break
      }
      case 'alt-6': {
        const range = this.mark ? this.buffer.rangeFrom(this.mark) : undefined
        const copied = range
          ? this.buffer.textInRange(range)
          : this.buffer.getLine(this.buffer.cursor.row) + '\n'
        if (copied) this.cutBuffer = copied
        this.mark = undefined
        this.message = range ? copied ? 'Copied selection' : 'Nothing selected' : 'Copied line'
        break
      }
      case 'ctrl-u':
        this.mark = undefined
        this.buffer.insert(this.cutBuffer)
        break
      case 'ctrl-z':
      case 'alt-u':
        this.mark = undefined
        this.message = this.buffer.undo() ? 'Undid change' : 'Nothing to undo'
        break
      case 'ctrl-r':
      case 'alt-e':
        this.mark = undefined
        this.message = this.buffer.redo() ? 'Redid change' : 'Nothing to redo'
        break
      case 'ctrl-c': {
        const { row } = this.buffer.cursor
        this.message = `line ${row + 1}/${this.buffer.lineCount}, column ${this.buffer.characterColumn + 1}`
        break
      }
      case 'alt-w':
        this.findNext()
        break
    }
  }

  async run() {
    const signalSubscription = this.proc.on('signal', (signal) => {
      this.receivedSignal = signal
      this.abortController.abort()
    })
    try {
      while (true) {
        this.redraw()
        const input = await this.readInput()
        if (! input) return signalExit(this.receivedSignal !)

        this.clearSearchHighlight()
        this.notice = undefined

        if (input.type !== 'key' || input.key !== 'ctrl-k') this.consecutiveCut = false
        if (input.type === 'key' && input.key === 'ctrl-g') {
          await this.showHelp()
          continue
        }
        if (input.type === 'key' && (input.key === 'ctrl-f' || input.key === 'ctrl-w')) {
          await this.search()
          continue
        }
        if (input.type === 'key' && (input.key === 'ctrl-t' || input.key === 'ctrl-_')) {
          await this.goTo()
          continue
        }

        if (input.type === 'key' && input.key === 'ctrl-o') {
          await this.writeOut()
          continue
        }
        if (input.type === 'key' && input.key === 'ctrl-x') {
          if (! this.modified) return 0
          const decision = await this.confirmExit()
          if (this.receivedSignal) return signalExit(this.receivedSignal)
          if (decision === 'discard') return 0
          if (decision === 'save' && await this.writeOut()) return 0
          this.message = decision === 'cancel' ? 'Cancelled' : this.message
          continue
        }
        this.edit(input, this.renderer.pageRows)
      }
    }
    finally {
      this.clearSearchHighlight()
      signalSubscription.dispose()
    }
  }
}

export const nano = createCommand('nano', '[FILE]', 'Edit a text file in the terminal.')
  .help('help')
  .whenUnknownOption('make-arg')
  .program(async ({ proc }, path, ...extraPaths) => {
    if (extraPaths.length) throw new UserError('Only one file can be edited at a time')
    if (! proc.stdio.stdin || ! proc.stdio.stdout) {
      throw new UserError('Standard input and output must be a terminal')
    }

    const filename = path ? Path.resolve(path, proc.cwd) : undefined
    let content = ''
    if (filename) {
      const opened = proc.fs.open(filename, 'r', '/')
      if (opened.isOk) content = opened.val.handle.read()
      else if (opened.err.type !== FOp.T.NOT_FOUND) {
        throw new UserError(`${filename}: ${FOp.displayError(opened.err)}`)
      }
    }
    if (content.length > MAX_FILE_SIZE) {
      throw new UserError(`File exceeds the ${MAX_FILE_SIZE} character editor limit`)
    }

    const session = new TerminalSession(proc.ctx.term)
    const editor = new NanoEditor(proc, session, filename, content)
    const resizeSubscription = session.onResize(() => editor.redraw())
    try {
      return await editor.run()
    }
    finally {
      resizeSubscription.dispose()
      session.dispose()
    }
  })
