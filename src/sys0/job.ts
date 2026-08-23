import type { Process } from './proc'
import type { ProcessExit } from './process_exit'
import type { Pid } from './process_table'

export type JobId = number
export type JobState = 'running' | 'completed'

export class ProcessGroup {
  private readonly members = new Map<Pid, Process>()
  private leaderPid: Pid | null = null

  get pgid() {
    return this.leaderPid
  }

  get size() {
    return this.members.size
  }

  add(process: Process) {
    this.leaderPid ??= process.pid
    this.members.set(process.pid, process)
  }

  remove(process: Process) {
    if (this.members.get(process.pid) === process) {
      this.members.delete(process.pid)
    }
  }

  values() {
    return [...this.members.values()]
  }

  interrupt() {
    this.values()
      .filter(process => process.parent?.processGroup !== this)
      .forEach(process => process.interrupt())
  }
}

export class Job {
  state: JobState = 'running'
  exitStatus: ProcessExit | null = null
  readonly completion: Promise<ProcessExit>

  constructor(
    public readonly id: JobId,
    public readonly group: ProcessGroup,
    public readonly command: string,
    completion: Promise<ProcessExit>,
  ) {
    this.completion = completion.then((exitStatus) => {
      this.state = 'completed'
      this.exitStatus = exitStatus
      return exitStatus
    })
  }
}

export class JobTable {
  private nextJobId: JobId = 1
  private readonly jobs = new Map<JobId, Job>()

  create(group: ProcessGroup, command: string, completion: Promise<ProcessExit>) {
    const job = new Job(this.nextJobId ++, group, command, completion)
    this.jobs.set(job.id, job)
    return job
  }

  get(id: JobId) {
    return this.jobs.get(id)
  }

  delete(id: JobId) {
    return this.jobs.delete(id)
  }

  values() {
    return [...this.jobs.values()].sort((left, right) => left.id - right.id)
  }
}
