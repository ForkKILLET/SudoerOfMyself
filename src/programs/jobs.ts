import { createCommand } from '@/sys0/program'

export const jobs = createCommand('jobs', '', 'List jobs started by this shell.')
  .help('help')
  .program(({ proc }) => {
    proc.jobTable?.values().forEach((job) => {
      const status = job.state === 'running'
        ? 'Running'
        : `Done (${job.exitStatus?.code ?? 0})`
      proc.stdio.writeLn(
        `[${job.id}] ${status.padEnd(10)} ${job.group.pgid ?? '-'} ${job.command}`,
      )
    })
    return 0
  })
