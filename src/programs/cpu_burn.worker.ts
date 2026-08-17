import { WorkerProcessApi } from '@/syscall/game'
import { startWorkerProgram, WorkerRuntimeScope } from '@/syscall/worker/runtime'

const cpuBurn = (process: WorkerProcessApi, name: string, durationArg = '10') => {
  void name
  const durationSeconds = Number(durationArg)
  if (! Number.isFinite(durationSeconds) || durationSeconds < 0) {
    process.writeLn(`cpu_burn: invalid duration: ${durationArg}`)
    return 1
  }

  process.writeLn(`Burning CPU for ${durationSeconds} second(s); press Ctrl+C to terminate.`).unwrap()
  const deadline = performance.now() + durationSeconds * 1000
  let accumulator = 0
  while (performance.now() < deadline) {
    accumulator = Math.imul(accumulator + 1, 2654435761)
  }
  process.writeLn(`CPU task completed (${accumulator >>> 0}).`).unwrap()
  return 0
}

startWorkerProgram(globalThis as unknown as WorkerRuntimeScope, cpuBurn)
