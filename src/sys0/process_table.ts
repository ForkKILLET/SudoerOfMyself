import type { Process } from './proc'
import type { ProcessSignal } from './process_exit'

export type Pid = number

export class ProcessTable {
  private nextPid: Pid = 1
  private readonly processes = new Map<Pid, Process>()

  register(process: Process): Pid {
    const pid = this.nextPid ++
    this.processes.set(pid, process)
    return pid
  }

  unregister(process: Process) {
    if (this.processes.get(process.pid) === process) {
      this.processes.delete(process.pid)
    }
  }

  get(pid: Pid) {
    return this.processes.get(pid)
  }

  has(pid: Pid) {
    return this.processes.has(pid)
  }

  sendSignal(pid: Pid, signal: ProcessSignal) {
    const process = this.processes.get(pid)
    if (! process) return false
    process.sendSignal(signal)
    return true
  }

  values() {
    return [...this.processes.values()]
  }

  get size() {
    return this.processes.size
  }
}
