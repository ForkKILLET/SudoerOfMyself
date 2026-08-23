import { createCommand } from '@/sys0/program'

export const ps = createCommand('ps', '', 'Report active processes.')
  .help('help')
  .program(({ proc }) => {
    const processes = proc.ctx.processes.values().sort((left, right) => left.pid - right.pid)
    const rows = processes.map(process => ({
      pid: process.pid.toString(),
      ppid: process.ppid.toString(),
      state: process.state,
      command: process.name,
    }))
    const pidWidth = Math.max('PID'.length, ...rows.map(row => row.pid.length))
    const ppidWidth = Math.max('PPID'.length, ...rows.map(row => row.ppid.length))
    const stateWidth = Math.max('STATE'.length, ...rows.map(row => row.state.length))

    proc.stdio.writeLn(
      `${'PID'.padStart(pidWidth)} ` +
      `${'PPID'.padStart(ppidWidth)} ` +
      `${'STATE'.padEnd(stateWidth)} COMMAND`,
    )
    rows.forEach((row) => {
      proc.stdio.writeLn(
        `${row.pid.padStart(pidWidth)} ` +
        `${row.ppid.padStart(ppidWidth)} ` +
        `${row.state.padEnd(stateWidth)} ${row.command}`,
      )
    })
    return 0
  })
