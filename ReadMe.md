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
than the native registry. Adding a native command to a later release therefore
requires both registering its implementation and installing its executable file,
normally through a file-system migration for existing saves.
