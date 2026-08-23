import type { Process } from '@/sys0/proc'
import { normalExit, ProcessExit } from '@/sys0/process_exit'

const EXIT_REQUESTS = new WeakMap<Process, ProcessExit>()

export const requestShellExit = (process: Process, code: number) => {
  const exitStatus = normalExit(code)
  EXIT_REQUESTS.set(process, exitStatus)
  return exitStatus
}

export const getShellExitRequest = (process: Process) => EXIT_REQUESTS.get(process)
