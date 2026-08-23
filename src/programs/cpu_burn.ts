import { createWorkerProgram } from '@/syscall/worker/host'

export const cpu_burn = createWorkerProgram({
  createWorker: () => new Worker(new URL('./cpu_burn.worker.ts', import.meta.url), { type: 'module' }),
})
