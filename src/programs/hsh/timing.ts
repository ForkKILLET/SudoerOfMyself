import type { Process } from '@/sys0/proc'
import {
  subtractProcessUsage,
  type ProcessUsage,
} from '@/sys0/process_usage'

export interface CommandTimingSnapshot {
  startedAtMs: number
  usage: ProcessUsage
}

const formatDuration = (milliseconds: number) => `${(milliseconds / 1_000).toFixed(3)}s`

export const startCommandTiming = (process: Process): CommandTimingSnapshot => ({
  startedAtMs: process.ctx.time?.monotonic.nowMs() ?? performance.now(),
  usage: process.accounting.totalUsage,
})

export const finishCommandTiming = (
  process: Process,
  started: CommandTimingSnapshot,
  usage = subtractProcessUsage(process.accounting.totalUsage, started.usage),
) => {
  const now = process.ctx.time?.monotonic.nowMs() ?? performance.now()
  process.stdio.writeErrorLn([
    `real ${formatDuration(Math.max(0, now - started.startedAtMs))}`,
    `user ${formatDuration(usage.userMs)}`,
    `sys  ${formatDuration(usage.systemMs)}`,
  ].join('\n'))
}
