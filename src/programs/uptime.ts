import { createCommand } from '@/sys0/program'
import { formatStrftime } from '@/sys0/time_format'

export const formatUptime = (milliseconds: number) => {
  const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1_000)
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const totalHours = Math.floor(totalMinutes / 60)
  const hours = totalHours % 24
  const days = Math.floor(totalHours / 24)
  const clock = [hours, minutes, seconds]
    .map(value => value.toString().padStart(2, '0'))
    .join(':')
  return days ? `${days} day${days === 1 ? '' : 's'}, ${clock}` : clock
}

export const uptime = createCommand('uptime', '', 'Show HumanOS running time.')
  .help('help')
  .program(({ proc }) => {
    proc.staticName = 'uptime'
    const { time } = proc.ctx
    const now = time.monotonic.nowMs()
    const gameTime = time.game.nowMs()
    const processCount = proc.ctx.processes.size
    proc.stdio.writeLn(
      `${formatStrftime('%H:%M:%S', gameTime, time.game.timezone)} ` +
      `up ${formatUptime(now - time.startedAtMs)}, ` +
      `${processCount} process${processCount === 1 ? '' : 'es'}`,
    )
    return 0
  })
