import { createCommand } from '@/sys0/program'
import { signalExit } from '@/sys0/process_exit'

const parseJobId = (value: string) => {
  const id = Number(value.startsWith('%') ? value.slice(1) : value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export const wait = createCommand('wait', '[JOB...]', 'Wait for background jobs to complete.')
  .help('help')
  .program(async ({ proc }, ...jobRefs) => {
    const table = proc.jobTable
    if (! table) return 0

    const selected = jobRefs.length
      ? jobRefs.map((ref) => {
          const id = parseJobId(ref)
          const job = id === null ? undefined : table.get(id)
          if (! job) proc.error(`${ref}: no such job`)
          return job
        }).filter(job => job !== undefined)
      : table.values()
    if (selected.length !== jobRefs.length && jobRefs.length) return 1
    if (! selected.length) return 0

    let resolveInterrupt = () => {}
    const interrupted = new Promise<'interrupted'>((resolve) => {
      resolveInterrupt = () => resolve('interrupted')
    })
    const signalSubscription = proc.on('signal', (signal) => {
      if (signal === 'SIGINT') resolveInterrupt()
    })
    try {
      const completed = Promise.all(selected.map(job => job.completion))
      const result = await Promise.race([completed, interrupted])
      if (result === 'interrupted') return signalExit('SIGINT')

      selected.forEach(job => table.delete(job.id))
      return result.at(- 1)?.code ?? 0
    }
    finally {
      signalSubscription.dispose()
    }
  })
