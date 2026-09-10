import { FOp } from '@/sys0/fs'
import { Path } from '@/sys0/fs/path'
import { createCommand } from '@/sys0/program'
import type { Process } from '@/sys0/proc'
import { signalExit, type ProcessSignal } from '@/sys0/process_exit'
import { TerminalSession } from '@/sys0/terminal_session'
import { errorMessage, UserError } from '@/utils/errors'
import { EditorInputDecoder, type EditorInput, type EditorKey } from './editor/input'
import { TextBuffer, type TextRange } from './editor/text_buffer'
import { VimRenderer, type VimMode } from './editor/vim_renderer'
import { VIM_HELP } from './editor/vim_help'
import { offsetOf, positionOf, resolveMotion, type VimMotion } from './editor/vim_motion'
import { nextMatch, parseSubstitution, searchMatches, searchRanges, substituteLines } from './editor/vim_search'
import { setVimOptions, type VimOptions } from './editor/vim_options'
import { readVimConfig } from './editor/vim_config'

const MAX_FILE_SIZE = 2 * 1024 * 1024

class VimEditor {
  private readonly buffer: TextBuffer
  private readonly input: EditorInputDecoder
  private readonly renderer: VimRenderer
  private readonly abortController = new AbortController()
  private receivedSignal: ProcessSignal | undefined
  private mode: VimMode = 'normal'
  private command = ''
  private message = ''
  private pending = ''
  private pendingCount = 1
  private operator: { key: string, count: number } | undefined
  private lastFind: { key: string, character: string } | undefined
  private count = ''
  private clipboard: { text: string, linewise: boolean } | undefined
  private commandPrefix: ':' | '/' | '?' = ':'
  private searchPattern = ''
  private searchDirection = 1
  private searchCount = 1
  private highlightedContent = ''
  private highlightedPattern = ''
  private highlightedRanges: TextRange[] = []
  private suppressHighlights = false
  private welcome: boolean
  private showingHelp = false
  private savedContent: string
  private writePending = false

  constructor(
    private readonly proc: Process,
    private readonly session: TerminalSession,
    private filename: string | undefined,
    content: string,
    private readonly options: VimOptions,
    diagnostics: string[],
  ) {
    this.buffer = new TextBuffer(content)
    this.savedContent = content
    this.welcome = ! filename
    this.message = diagnostics.length
      ? diagnostics[0] + (diagnostics.length > 1 ? ` (${diagnostics.length - 1} more configuration errors)` : '')
      : ''
    this.input = new EditorInputDecoder(proc.stdio.input, { metaShortcuts: false })
    this.renderer = new VimRenderer(session, this.buffer)
  }

  private get modified() {
    return this.writePending || this.buffer.content !== this.savedContent
  }

  redraw() {
    this.session.setPageLeaveGuard(this.modified)
    let highlights: TextRange[] = []
    if (this.options.hlsearch && ! this.suppressHighlights && this.searchPattern) {
      const content = this.buffer.content
      if (content !== this.highlightedContent || this.searchPattern !== this.highlightedPattern) {
        this.highlightedRanges = searchRanges(content, this.searchPattern)
        this.highlightedContent = content
        this.highlightedPattern = this.searchPattern
      }
      highlights = this.highlightedRanges
    }
    this.renderer.render({
      mode: this.mode,
      filename: this.filename,
      modified: this.modified,
      command: this.command,
      commandPrefix: this.commandPrefix,
      message: this.message || (this.operator?.key ?? '') + this.count + this.pending,
      help: this.showingHelp,
      welcome: this.welcome,
      searchHighlights: highlights,
      number: this.options.number,
      wrap: this.options.wrap,
      cursorline: this.options.cursorline,
    })
  }

  // Normal mode sits on a character, never on the insertion point after a line.
  private clampCursor() {
    const { row, column } = this.buffer.cursor
    const line = this.buffer.getLine(row)
    if (line && column >= line.length) {
      this.buffer.cursor.column = line.length - Array.from(line).at(- 1) !.length
    }
  }

  private normalMode() {
    if (this.mode === 'insert' && this.buffer.cursor.column > 0) this.buffer.moveLeft()
    this.buffer.endUndoGroup()
    this.mode = 'normal'
    this.clearPending()
    this.command = ''
    this.clampCursor()
  }

  private insertMode(key: string) {
    this.buffer.beginUndoGroup()
    if (key === 'a' && this.buffer.getLine(this.buffer.cursor.row)) this.buffer.moveRight()
    if (key === 'A' || key === 'o') this.buffer.moveToLineEnd()
    if (key === 'I') this.firstNonblank()
    if (key === 'o') this.buffer.insert('\n')
    if (key === 'O') {
      const row = this.buffer.cursor.row
      this.buffer.moveToLineStart()
      this.buffer.insert('\n')
      this.buffer.moveTo(row)
    }
    this.mode = 'insert'
  }

  private firstNonblank() {
    const line = this.buffer.getLine(this.buffer.cursor.row)
    this.buffer.moveTo(this.buffer.cursor.row, Array.from(/^\s*/u.exec(line) ![0]).length)
    this.clampCursor()
  }

  private clearPending() {
    this.operator = undefined
    this.pending = this.count = ''
    this.pendingCount = 1
  }

  private lineOperation(key: string, first: number, last: number) {
    const lines = Array.from({ length: last - first + 1 }, (_, i) => this.buffer.getLine(first + i))
    this.clipboard = { text: lines.join('\n'), linewise: true }
    if (key === 'y') return
    this.buffer.beginUndoGroup()
    const range = key === 'c'
      ? { start: { row: first, column: 0 }, end: { row: last, column: this.buffer.getLine(last).length } }
      : last + 1 < this.buffer.lineCount
        ? { start: { row: first, column: 0 }, end: { row: last + 1, column: 0 } }
        : {
            start: first > 0 ? { row: first - 1, column: this.buffer.getLine(first - 1).length } : { row: 0, column: 0 },
            end: { row: last, column: this.buffer.getLine(last).length },
          }
    this.buffer.cutRange(range)
    this.buffer.moveTo(Math.min(first, this.buffer.lineCount - 1))
    if (key === 'c') this.mode = 'insert'
    else {
      this.buffer.endUndoGroup()
      this.firstNonblank()
    }
  }

  private applyMotion(motion: VimMotion) {
    const operator = this.operator
    this.clearPending()
    if (! operator) {
      this.buffer.moveTo(motion.target.row, Array.from(this.buffer.getLine(motion.target.row).slice(0, motion.target.column)).length)
      this.clampCursor()
      return
    }
    const start = { ...this.buffer.cursor }
    if (motion.linewise) {
      this.lineOperation(operator.key, Math.min(start.row, motion.target.row), Math.max(start.row, motion.target.row))
      return
    }
    let first = offsetOf(this.buffer, start)
    let last = offsetOf(this.buffer, motion.target)
    if (first > last) [first, last] = [last, first]
    const content = this.buffer.content
    if (motion.inclusive && last < content.length && content[last] !== '\n') {
      last += String.fromCodePoint(content.codePointAt(last) !).length
    }
    const range = { start: positionOf(content, first), end: positionOf(content, last) }
    if (first === last) {
      if (operator.key === 'c' && ! this.buffer.getLine(start.row)) {
        this.buffer.beginUndoGroup()
        this.mode = 'insert'
      }
      return
    }
    this.clipboard = { text: this.buffer.textInRange(range), linewise: false }
    if (operator.key === 'y') return
    this.buffer.beginUndoGroup()
    this.buffer.cutRange(range)
    if (operator.key === 'c') this.mode = 'insert'
    else {
      this.buffer.endUndoGroup()
      this.clampCursor()
    }
  }

  private finishMotion(key: string, count: number, explicit: boolean, character?: string) {
    if (key === 'word-left') key = 'b'
    if (key === 'word-right') key = 'w'
    let total = Math.min(10000, count * (this.operator?.count ?? 1))
    if (this.operator?.key === 'c' && ['w', 'W'].includes(key)
      && /\S/u.test(this.buffer.getLine(this.buffer.cursor.row).slice(this.buffer.cursor.column, this.buffer.cursor.column + 1))) {
      key = key === 'w' ? 'e' : 'E'
      // ce normally advances from a word's final character; cw changes it.
      const chars = Array.from(this.buffer.getLine(this.buffer.cursor.row).slice(this.buffer.cursor.column))
      const kind = (char: string) => /\s/u.test(char) ? 0 : key === 'E' || /[\p{L}\p{N}_]/u.test(char) ? 1 : 2
      if (chars.length === 1 || kind(chars[0]) !== kind(chars[1])) {
        if (total === 1) {
          this.applyMotion({ target: { ...this.buffer.cursor }, inclusive: true })
          return true
        }
        total --
      }
    }
    let motion = resolveMotion(this.buffer, key, total, explicit || (!! this.operator && this.operator.count > 1), character)
    if (! motion) return false
    // dw at a line's final word leaves its newline intact.
    if (this.operator && ['w', 'W'].includes(key) && motion.target.row > this.buffer.cursor.row && motion.target.column === 0) {
      motion = { target: { row: motion.target.row - 1, column: this.buffer.getLine(motion.target.row - 1).length } }
    }
    if (! this.operator && ['j', 'down', 'k', 'up'].includes(key)) {
      this.buffer.moveVertical(key === 'j' || key === 'down' ? total : - total)
      this.clearPending()
      this.clampCursor()
    }
    else this.applyMotion(motion)
    return true
  }

  private paste(before: boolean, count: number) {
    if (! this.clipboard) return
    const { text, linewise } = this.clipboard
    const row = this.buffer.cursor.row
    this.buffer.beginUndoGroup()
    if (linewise) {
      const value = Array(count).fill(text).join('\n')
      if (before) {
        this.buffer.moveToLineStart()
        this.buffer.insert(value + '\n')
        this.buffer.moveTo(row)
      }
      else {
        this.buffer.moveToLineEnd()
        this.buffer.insert('\n' + value)
        this.buffer.moveTo(row + 1)
      }
      this.firstNonblank()
    }
    else {
      if (! before && this.buffer.getLine(row)) this.buffer.moveRight()
      this.buffer.insert(text.repeat(count))
      if (this.buffer.cursor.column > 0) this.buffer.moveLeft()
    }
    this.buffer.endUndoGroup()
    this.clampCursor()
  }

  private replaceCharacter(character: string, count: number) {
    const start = { ...this.buffer.cursor }
    const characters = Array.from(this.buffer.getLine(start.row).slice(start.column))
    if (characters.length < count) {
      this.message = 'Not enough characters to replace'
      return
    }
    this.buffer.beginUndoGroup()
    this.buffer.cutRange({
      start, end: { row: start.row, column: start.column + characters.slice(0, count).join('').length },
    })
    this.buffer.insert(character.repeat(count))
    this.buffer.moveLeft()
    this.buffer.endUndoGroup()
  }

  private normalKey(key: string) {
    if (this.pending && this.pending !== 'g') {
      const pending = this.pending
      const count = this.pendingCount
      this.pending = ''
      if (Array.from(key).length !== 1) {
        this.clearPending()
        return
      }
      if (pending === 'r') this.replaceCharacter(key, count)
      else {
        this.lastFind = { key: pending, character: key }
        if (! this.finishMotion(pending, count, false, key)) {
          this.clearPending()
          this.message = 'Character not found: ' + key
        }
      }
      return
    }
    if (/^[0-9]$/u.test(key) && (key !== '0' || this.count)) {
      this.count = String(Math.min(10000, Number(this.count + key)))
      return
    }
    const count = Number(this.count || 1)
    const explicit = !! this.count
    this.count = ''
    if (this.pending === 'g') {
      const pendingCount = this.pendingCount
      this.pending = ''
      if (key === 'g') this.finishMotion('gg', pendingCount, true)
      else {
        this.clearPending()
        this.message = 'Unsupported motion: g' + key
      }
      return
    }
    if (['d', 'c', 'y'].includes(key)) {
      if (! this.operator) this.operator = { key, count }
      else {
        const operator = this.operator
        this.clearPending()
        if (operator.key === key) this.lineOperation(key, this.buffer.cursor.row, Math.min(
          this.buffer.lineCount - 1, this.buffer.cursor.row + count * operator.count - 1,
        ))
        else this.message = 'Unsupported operator: ' + operator.key + key
      }
      return
    }
    if (['g', 'f', 'F', 't', 'T'].includes(key) || (key === 'r' && ! this.operator)) {
      this.pending = key
      this.pendingCount = count
      return
    }
    if (key === '/' || key === '?') {
      this.mode = 'command'
      this.commandPrefix = key
      this.searchCount = count * (this.operator?.count ?? 1)
      this.command = ''
      return
    }
    if (key === 'n' || key === 'N') {
      this.search(this.searchPattern, this.searchDirection * (key === 'n' ? 1 : - 1), count * (this.operator?.count ?? 1))
      return
    }
    if (key === ';' || key === ',') {
      if (this.lastFind) {
        const { key: find, character } = this.lastFind
        const actual = key === ';' ? find : find === find.toLowerCase() ? find.toUpperCase() : find.toLowerCase()
        let repeats = count
        const motion = resolveMotion(this.buffer, actual, repeats, false, character)
        if (actual.toLowerCase() === 't' && motion?.target.column === this.buffer.cursor.column) repeats ++
        if (! this.finishMotion(actual, repeats, false, character)) {
          this.clearPending()
          this.message = 'Character not found: ' + character
        }
      }
      else this.clearPending()
      return
    }
    if (this.finishMotion(key, count, explicit)) return
    if (this.operator) {
      this.clearPending()
      this.message = 'Unsupported motion: ' + key
      return
    }
    if (['i', 'a', 'I', 'A', 'o', 'O'].includes(key)) this.insertMode(key)
    else if (key === 'x' || key === 'delete' || key === 'D' || key === 'C') {
      this.operator = { key: key === 'C' ? 'c' : 'd', count: 1 }
      this.finishMotion(key === 'D' || key === 'C' ? '$' : 'l', count, true)
    }
    else if (key === 'p' || key === 'P') this.paste(key === 'P', count)
    else if (key === 'u') this.message = this.buffer.undo() ? '' : 'Already at oldest change'
    else if (key === 'ctrl-r') this.message = this.buffer.redo() ? '' : 'Already at newest change'
    else if (key === ':') {
      this.mode = 'command'
      this.commandPrefix = ':'
      this.command = ''
    }
    else if (['page-down', 'ctrl-f', 'page-up', 'ctrl-b'].includes(key)) {
      this.renderer.movePage(count * (key === 'page-down' || key === 'ctrl-f' ? 1 : - 1), this.options.wrap, this.options.number)
    }
    else if (key === 'ctrl-c') this.message = 'Type :q to quit, or :q! to discard changes'
    if (this.mode === 'normal') this.clampCursor()
  }

  private search(pattern: string, direction: number, count: number) {
    this.suppressHighlights = false
    try {
      if (! pattern) throw new UserError('No previous search pattern')
      const matches = searchMatches(this.buffer.content, pattern)
      const found = nextMatch(matches, offsetOf(this.buffer, this.buffer.cursor), direction, count)
      if (! found) throw new UserError('Pattern not found: ' + pattern)
      const content = this.buffer.content
      const range = { start: positionOf(content, found.match.start), end: positionOf(content, found.match.end) }
      this.applyMotion({ target: range.start })
      this.message = found.wrapped ? 'Search wrapped' : ''
    }
    catch (error) {
      this.message = errorMessage(error)
      this.clearPending()
    }
  }

  private substitute(command: string) {
    const finalNewline = this.buffer.content.endsWith('\n')
    const lineCount = Math.max(1, this.buffer.lineCount - (finalNewline ? 1 : 0))
    const parsed = parseSubstitution(command, Math.min(this.buffer.cursor.row, lineCount - 1), lineCount, this.searchPattern)
    if (! parsed) return false
    const result = substituteLines(Array.from({ length: lineCount }, (_, row) => this.buffer.getLine(row)), parsed)
    const content = result.content + (finalNewline ? '\n' : '')
    if (! result.count) throw new UserError('Pattern not found: ' + parsed.pattern)
    this.searchPattern = parsed.pattern
    this.suppressHighlights = false
    if (content === this.buffer.content) {
      this.message = result.count + ' substitutions (unchanged)'
      return true
    }
    this.buffer.beginUndoGroup()
    this.buffer.cutRange({
      start: { row: 0, column: 0 },
      end: { row: this.buffer.lineCount - 1, column: this.buffer.getLine(this.buffer.lineCount - 1).length },
    })
    this.buffer.insert(content)
    this.buffer.moveTo(result.lastRow)
    this.firstNonblank()
    this.buffer.endUndoGroup()
    this.message = result.count + ' substitutions'
    return true
  }

  private async writeFile(path?: string) {
    const filename = path ? Path.resolve(path, this.proc.cwd) : this.filename
    if (! filename) {
      this.message = 'No file name; use :w FILE'
      return false
    }
    // An explicit alternative path must not silently replace an existing file.
    if (filename !== this.filename && this.proc.fs.find(filename).isOk) {
      this.message = `${filename}: File exists`
      return false
    }
    try {
      const opened = this.proc.fs.open(filename, 'w', '/')
      if (opened.isErr) {
        this.message = `${filename}: ${FOp.displayError(opened.err)}`
        return false
      }
      opened.val.handle.write(this.buffer.content)
      // Keep the newly created path retryable if persistence fails after the
      // in-memory write, without treating it as successfully saved.
      this.filename = filename
      this.writePending = true
      await this.proc.fs.flush()
      this.savedContent = this.buffer.content
      this.writePending = false
      this.message = `"${filename}" ${this.buffer.lineCount} lines written`
      return true
    }
    catch (error) {
      this.message = `Error writing file: ${errorMessage(error)}`
      return false
    }
  }

  private async executeCommand() {
    if (this.commandPrefix !== ':') {
      const pattern = this.command || this.searchPattern
      const direction = this.commandPrefix === '/' ? 1 : - 1
      this.mode = 'normal'
      this.command = ''
      try {
        // Invalid patterns do not replace the last usable search.
        searchMatches('', pattern)
        this.searchPattern = pattern
        this.searchDirection = direction
        this.search(pattern, direction, this.searchCount)
      }
      catch (error) {
        this.message = errorMessage(error)
        this.clearPending()
      }
      return false
    }
    const command = this.command.trim()
    this.normalMode()
    if (! command) return false
    if (/^set(?:\s|$)/u.test(command)) {
      try {
        const previous = this.options.hlsearch
        this.message = setVimOptions(this.options, command.slice(3))
        if (this.options.hlsearch && ! previous) this.suppressHighlights = false
      }
      catch (error) {
        this.message = errorMessage(error)
      }
      return false
    }
    if (command === 'noh' || command === 'nohlsearch') {
      this.suppressHighlights = true
      return false
    }
    if (command === 'q!') return true
    if (command === 'q') {
      if (! this.modified) return true
      this.message = 'No write since last change (use :q! to discard)'
    }
    else if (/^\d+$/u.test(command)) {
      this.buffer.moveTo(Math.max(0, Number(command) - 1))
      this.firstNonblank()
    }
    else if (command === 'help') {
      this.showingHelp = true
      this.renderer.scrollHelp(- Infinity)
    }
    else {
      try {
        if (this.substitute(command)) return false
      }
      catch (error) {
        this.message = errorMessage(error)
        return false
      }
      const match = /^(wq|w)(?:\s+(.+))?$/u.exec(command)
      if (! match) this.message = `Not an editor command: ${command}`
      else if (await this.writeFile(match[2]) && match[1] === 'wq') return true
    }
    return false
  }

  private insertKey(key: EditorKey) {
    if (key === 'enter') this.buffer.insert('\n')
    else if (key === 'tab') this.buffer.insert('\t')
    else if (key === 'backspace') this.buffer.backspace()
    else if (key === 'delete') this.buffer.deleteForward()
    else if (key === 'up' || key === 'down') this.buffer.moveVertical(key === 'up' ? - 1 : 1)
    else if (key === 'left') this.buffer.moveLeft()
    else if (key === 'right') this.buffer.moveRight()
    else if (key === 'home') this.buffer.moveToLineStart()
    else if (key === 'end') this.buffer.moveToLineEnd()
    else if (key === 'file-start') this.buffer.moveToFileStart()
    else if (key === 'file-end') this.buffer.moveToFileEnd()
    else if (key === 'word-left' || key === 'word-right') this.buffer.moveWord(key === 'word-left' ? - 1 : 1)
    else if (key === 'page-up' || key === 'page-down') {
      this.renderer.movePage(key === 'page-up' ? - 1 : 1, this.options.wrap, this.options.number)
    }
  }

  private async handle(input: EditorInput) {
    this.message = ''
    this.welcome = false
    if (this.showingHelp) {
      const key = input.type === 'key' ? input.key : input.type === 'text' ? input.value : ''
      if (['escape', 'ctrl-c', 'q', 'enter'].includes(key)) this.showingHelp = false
      else if (key === 'j' || key === 'down') this.renderer.scrollHelp(1)
      else if (key === 'k' || key === 'up') this.renderer.scrollHelp(- 1)
      else if (key === 'page-down') this.renderer.scrollHelp(this.renderer.pageRows)
      else if (key === 'page-up') this.renderer.scrollHelp(- this.renderer.pageRows)
      return false
    }
    if (input.type === 'key' && (input.key === 'escape' || input.key === 'ctrl-c')) {
      const wasNormal = this.mode === 'normal'
      this.normalMode()
      if (wasNormal && input.key === 'ctrl-c') this.normalKey('ctrl-c')
      return false
    }
    if (this.mode === 'command') {
      if (input.type !== 'key') this.command += input.value.replace(/[\r\n]/gu, '')
      else if (input.key === 'enter') return this.executeCommand()
      else if (input.key === 'backspace') {
        if (! this.command) this.normalMode()
        else this.command = Array.from(this.command).slice(0, - 1).join('')
      }
      else if (input.key === 'ctrl-u') this.command = ''
      return false
    }
    if (input.type === 'paste') {
      if (this.mode === 'insert') this.buffer.insert(input.value)
      else this.message = 'Enter Insert mode (i) before pasting'
      return false
    }
    if (input.type === 'key') {
      if (this.mode === 'insert') this.insertKey(input.key)
      else this.normalKey(input.key)
    }
    else {
      // A single terminal chunk can contain both commands and inserted text.
      const characters = Array.from(input.value)
      for (let i = 0; i < characters.length; i ++) {
        const mode = this.currentMode()
        if (mode === 'insert') {
          this.buffer.insert(characters.slice(i).join(''))
          break
        }
        if (mode === 'command') {
          this.command += characters.slice(i).join('')
          break
        }
        this.normalKey(characters[i])
      }
    }
    return false
  }

  private currentMode(): VimMode {
    return this.mode
  }

  async run() {
    const subscription = this.proc.on('signal', (signal) => {
      this.receivedSignal = signal
      this.abortController.abort()
    })
    try {
      while (true) {
        this.redraw()
        const input = await this.input.read({ signal: this.abortController.signal })
        if (this.receivedSignal) return signalExit(this.receivedSignal)
        const exit = await this.handle(input)
        if (this.receivedSignal) return signalExit(this.receivedSignal)
        if (exit) return 0
      }
    }
    finally {
      subscription.dispose()
    }
  }
}

export const vim = createCommand('vim', '[FILE]', 'Edit a text file with a small modal editor.')
  .usage(VIM_HELP.join('\n'))
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
    const config = readVimConfig(proc)
    const session = new TerminalSession(proc.ctx.term)
    const editor = new VimEditor(proc, session, filename, content, config.options, config.diagnostics)
    const resizeSubscription = session.onResize(() => editor.redraw())
    try {
      return await editor.run()
    }
    finally {
      resizeSubscription.dispose()
      session.dispose()
    }
  })
