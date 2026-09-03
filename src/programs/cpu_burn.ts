import { createWorkerProgram } from '@/syscall/worker/host'
import { createCommand } from '@/sys0/program'

const runCpuBurn = createWorkerProgram({
  createWorker: () => new Worker(new URL('./cpu_burn.worker.ts', import.meta.url), { type: 'module' }),
})

export const cpu_burn = createCommand(
  'cpu_burn', '[SECONDS]', 'Run a CPU-intensive task in a worker.',
)
  .help('help')
  .program(({ proc, name }, ...args) => runCpuBurn(proc, name, ...args))
