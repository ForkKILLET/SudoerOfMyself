# Sudoer Of Myself

## Todo

- [ ] Sys0 infrastructure

  - [ ] Process
    - [ ] PID
    - [ ] Schedule (possible in JS?)

  - [ ] Shell
    - [x] History file
    - [x] Tab completion
    - [ ] Pipe
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
preview servers send the required COOP/COEP headers. Production hosting must send
the same headers:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```
