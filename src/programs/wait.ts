import { createCommand } from '@/sys0/program'
import { ProcessSignal, signalExit } from '@/sys0/process_exit'
import { parseJobId } from './job_ref'

export const wait = createCommand('wait', '[JOB...]', 'Wait for background jobs to complete.')
  .help('help')
  .program(async ({ proc }, ...jobRefs) => {
    const table = proc.jobTable
    if (! table) return 0

    const selected = jobRefs.length
      ? jobRefs.map((ref) => {
          const id = parseJobId(ref, true)
          const job = id === null ? undefined : table.get(id)
          if (! job) proc.error(`${ref}: no such job`)
          return job
        }).filter(job => job !== undefined)
      : table.values()
    if (selected.length !== jobRefs.length && jobRefs.length) return 1
    if (! selected.length) return 0

    let resolveSignal: (signal: ProcessSignal) => void = () => {}
    const signalled = new Promise<ProcessSignal>((resolve) => {
      resolveSignal = resolve
    })
    const signalSubscription = proc.on('signal', resolveSignal)
    try {
      const completed = Promise.all(selected.map(job => job.completion))
      const result = await Promise.race([completed, signalled])
      if (typeof result === 'string') return signalExit(result)

      selected.forEach(job => table.delete(job.id))
      return result.at(- 1)?.code ?? 0
    }
    finally {
      signalSubscription.dispose()
    }
  })
