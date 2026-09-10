# Sudoer Of Myself

## Todo

- [ ] Sys0 infrastructure

  - [ ] Process
    - [x] PID
    - [ ] Schedule (possible in JS?)

  - [ ] Shell
    - [x] Stderr
    - [x] History file
    - [x] Tab completion
    - [x] Pipe
    - [x] Background jobs (`&`, `jobs`, `wait`)
    - [x] Input redirecting
    - [ ] Env setting
    - [ ] Control flow syntax

  - [ ] File attributes
    - [ ] Times
    - [ ] Modes

  - [ ] Programs
    - [x] `cat` (read stdin)
    - [x] `rm`
    - [ ] `ls` (options)
      - [x] `-a`
      - [ ] `-l`
    - [ ] `ln` (soft and hard)

- [ ] Story

## Worker programs

CPU-heavy programs can run through the Worker process runtime and make synchronous,
typed syscalls back to the main-thread kernel. Run `cpu_burn [SECONDS]` to exercise
the path; Ctrl+C terminates the Worker even while it is inside a CPU-bound loop.

`SharedArrayBuffer` requires a cross-origin-isolated page. The Vite development and
preview servers send the required COOP/COEP headers. Static hosts such as GitHub
Pages use `coi-serviceworker.js` as a fallback. Other production hosts should send
the headers directly when possible:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## Executable model

Native commands have two independent parts:

- `NATIVE_PROGRAMS` contains the JavaScript implementations available in the build.
- Executable regular files installed in directories such as `/bin` select an
  implementation through their inode's `executable` metadata.

`ExecService` is the only component that resolves commands through `PATH` and joins
these two parts. Shell completion also reads the installed executable files rather
than the native registry. `/bin` is a read-only in-memory file system mounted fresh
on every boot, so adding a native command only requires registering its implementation;
the executable image is generated from the registry. `fs_format` resets only the
persistent root file system.

## Terminal size

Drag the terminal's lower-right corner to resize by character cells; the temporary
badge shows columns × rows. Escape cancels a drag. Font size stays unchanged.

The size button beside the fullscreen control toggles directly between **Fit to
window** and **Custom**, restoring the last custom size (initially 97 × 30).
Dragging switches to Custom. The browser remembers both the mode and custom size.
Fixed sizes shrink temporarily when space is limited and return when space is
available again; fit mode follows the window continuously.

## Text editors

`nano -l [FILE]` (or `--linenumbers`) enables line numbers; `Alt+#` toggles
them while editing.

`vim [FILE]` opens a small modal editor. Press `i` to insert text and `Esc` to
return to Normal mode. Use `:w` to save, `:q` to quit, `:wq` to save and quit,
or `:q!` to discard unsaved changes. An unnamed buffer can be saved with
`:w FILE`. Use `:help` (or `vim --help`) for movement, editing, line copy/paste,
and undo/redo keys. Named files start with `"path" xL, xB` (UTF-8 bytes); an
unnamed buffer starts with centered help. The editor preserves whether the
buffer ends in a newline.

Operators `d`, `c`, and `y` combine with motions, including `w/b/e`, `W/B/E`,
`0/^/$`, `gg/G`, `f/F/t/T`, `%`, and searches. Examples: `dw`, `c$`, `y2w`,
`2d3w`. `/pattern` and `?pattern` search in either direction; `n/N` repeat or
reverse the search. `rCHAR` replaces a character. `:s/old/new/`, `:%s/old/new/g`,
and `:2,5s/old/new/gi` substitute on the current line, whole file, or a line
range. Patterns use JavaScript Unicode regular expressions; replacements
support `&`, `\1`–`\9`, and `\r` for a newline. Each Insert session, change
operation plus inserted text, or substitution is one undo step. Visual mode,
text objects, and named registers are not implemented.

vim supports boolean options via `:set`: `number` (`nu`),
`hlsearch` (`hls`), `wrap`, and `cursorline` (`cul`). Prefix with `no` to disable, append `?` to query,
`!` to toggle, or `&` to reset; multiple options can be set together. Defaults
are `nonumber hlsearch wrap cursorline`. `:set` / `:set all` lists their values. Search
highlighting covers all matches and follows edits; `:noh` clears it until the
next search. Soft wrap changes only display, not file contents; continuation
rows have a blank number gutter. `nowrap` uses horizontal scrolling.

The current line number is highlighted when numbers are enabled. `cursorline`
adds a gray background across the entire logical line, including wrapped rows;
search matches keep their own highlight colors.

At startup, vim loads `$HOME/.vimrc` from the virtual file system, falling back
to the account's home directory when `HOME` is unset. The supported configuration
subset is `set` commands (an optional leading colon is accepted), blank lines,
and double-quote comments; full Vimscript is not implemented. Invalid lines are
reported with their line numbers without preventing valid later lines or editing.
Interactive `:set` changes last only for the current session; they do not rewrite
the config. For example:

```vim
" Display settings
set number
set cursorline hlsearch
set nowrap
```

## Save recovery

If startup throws, the game replaces the terminal with a recovery screen. The save
can be exported as a JSON archive containing the raw IndexedDB metadata and inode
records, including malformed data, before the file-system database is reset and
the page is reloaded.

The writable root file system is held synchronously in memory and persisted as
inode-level deltas. IndexedDB stores metadata and inodes separately, but applies
each delta and its revision update in one transaction. A Web Lock prevents two
tabs from writing the same origin concurrently.
