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
  const startedAt = performance.now()
  const deadline = startedAt + durationSeconds * 1000
  let nextReportAt = startedAt + 1000
  let accumulator = 0
  let now = startedAt
  while (now < deadline) {
    accumulator = Math.imul(accumulator + 1, 2654435761)
    now = performance.now()
    if (now >= nextReportAt) {
      process.reportCpuTime(now - startedAt)
      nextReportAt += 1000
    }
  }
  process.reportCpuTime(now - startedAt)
  process.writeLn(`CPU task completed (${accumulator >>> 0}).`).unwrap()
  return 0
}

startWorkerProgram(globalThis as unknown as WorkerRuntimeScope, cpuBurn)
