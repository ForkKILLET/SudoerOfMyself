import { createCommand } from '@/sys0/program'

export const formatProcessTime = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const totalHours = Math.floor(totalMinutes / 60)
  const hours = totalHours % 24
  const days = Math.floor(totalHours / 24)
  const clock = [hours, minutes, seconds]
    .map(value => value.toString().padStart(2, '0'))
    .join(':')
  return days ? `${days}-${clock}` : clock
}

export const ps = createCommand('ps', '', 'Report active processes.')
  .help('help')
  .program(({ proc }) => {
    const processes = proc.ctx.processes.values()
    const rows = processes.map((process) => {
      const { userMs, systemMs } = process.accounting.selfUsage
      return {
        pid: process.pid.toString(),
        time: formatProcessTime(userMs + systemMs),
        command: process.name,
      }
    })
    const pidWidth = Math.max(7, ...rows.map(row => row.pid.length))
    const timeWidth = Math.max(8, ...rows.map(row => row.time.length))

    proc.stdio.writeLn(
      `${'PID'.padStart(pidWidth)} ` +
      `${'TIME'.padStart(timeWidth)} CMD`,
    )
    rows.forEach((row) => {
      proc.stdio.writeLn(
        `${row.pid.padStart(pidWidth)} ` +
        `${row.time.padStart(timeWidth)} ${row.command}`,
      )
    })
    return 0
  })
