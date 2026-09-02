import type { Process } from './proc'
import type { ProcessExit, ProcessSignal } from './process_exit'
import type { Pid } from './process_table'
import { Emitter, type Events } from '@/utils/emitter'
import { addProcessUsage, emptyProcessUsage, type ProcessUsage } from './process_usage'

export type JobId = number
export type JobState = 'running' | 'completed'

export class ProcessGroup {
  private readonly members = new Map<Pid, Process>()
  private leaderPid: Pid | null = null
  private completedUsage = emptyProcessUsage()

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
      this.completedUsage = addProcessUsage(this.completedUsage, process.accounting.selfUsage)
      this.members.delete(process.pid)
    }
  }

  get usage(): ProcessUsage {
    return this.values().reduce(
      (usage, process) => addProcessUsage(usage, process.accounting.selfUsage),
      { ...this.completedUsage },
    )
  }

  values() {
    return [...this.members.values()]
  }

  sendSignal(signal: ProcessSignal) {
    this.values().forEach(process => process.sendSignal(signal))
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

export interface JobTableEvents extends Events {
  completed: [Job]
}

const COMPLETION_LABELS: Partial<Record<ProcessSignal, string>> = {
  SIGINT: 'interrupted',
  SIGKILL: 'killed',
  SIGTERM: 'terminated',
}

export const formatJobCompletion = (job: Job, marker = ' ') => {
  const exitStatus = job.exitStatus
  const status = ! exitStatus || exitStatus.reason === 'exit'
    ? exitStatus?.code ? `exit ${exitStatus.code}` : 'done'
    : COMPLETION_LABELS[exitStatus.signal] ?? `killed (${exitStatus.signal})`
  return `[${job.id}]  ${marker} ${job.group.pgid ?? '-'} ${status.padEnd(10)} ${job.command}`
}

export class JobTable extends Emitter<JobTableEvents> {
  private nextJobId: JobId = 1
  private readonly jobs = new Map<JobId, Job>()

  create(group: ProcessGroup, command: string, completion: Promise<ProcessExit>) {
    const job = new Job(this.nextJobId ++, group, command, completion)
    this.jobs.set(job.id, job)
    void job.completion.then(() => this.emit('completed', job))
    return job
  }

  markerFor(job: Job) {
    const jobs = this.values()
    const index = jobs.indexOf(job)
    if (index === jobs.length - 1) return '+'
    if (index === jobs.length - 2) return '-'
    return ' '
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
