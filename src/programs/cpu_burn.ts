import { Program } from '@/sys0/program'
import { WorkerProgramDefinition } from '@/syscall/worker/host'

const cpuBurnWorker: WorkerProgramDefinition = {
  createWorker: () => new Worker(new URL('./cpu_burn.worker.ts', import.meta.url), { type: 'module' }),
}

export const cpu_burn: Program = (process, name, ...args) => (
  process.spawnWorker(cpuBurnWorker, { name }, ...args)
)
