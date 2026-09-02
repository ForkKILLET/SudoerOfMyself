import { createCommand } from '@/sys0/program'

export const formatCpuDuration = (milliseconds: number) => {
  const minutes = Math.floor(milliseconds / 60_000)
  const seconds = (milliseconds - minutes * 60_000) / 1_000
  return `${minutes}m${seconds.toFixed(3)}s`
}

export const times = createCommand('times', '', 'Show shell and child process CPU time.')
  .help('help')
  .program(({ proc }) => {
    const self = proc.accounting.selfUsage
    const children = proc.accounting.childUsage
    proc.stdio.writeLn(
      `${formatCpuDuration(self.userMs)} ${formatCpuDuration(self.systemMs)}\n` +
      `${formatCpuDuration(children.userMs)} ${formatCpuDuration(children.systemMs)}`,
    )
    return 0
  })
