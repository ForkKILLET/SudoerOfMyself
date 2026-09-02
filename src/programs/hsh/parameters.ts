import type { Process } from '@/sys0/proc'
import type { DynamicShellVariable } from '@/sys0/env'

export const getPositionalParameters = (process: Process) => {
  const count = Number.parseInt(process.env['#'] ?? '0', 10)
  if (! Number.isSafeInteger(count) || count <= 0) return []
  return Array.from(
    { length: count },
    (_, index) => process.env[String(index + 1)] ?? '',
  )
}

export const setPositionalParameters = (process: Process, args: string[]) => {
  Object.keys(process.env)
    .filter(name => /^\d+$/.test(name) && name !== '0')
    .forEach(name => process.variables.unset(name))

  process.variables.set('#', args.length.toString(), { exported: false })
  process.variables.set('*', args.join(' '), { exported: false })
  process.variables.set('@', args.join(' '), { exported: false })
  args.forEach((value, index) => {
    process.variables.set(String(index + 1), value, { exported: false })
  })
}

export const initializeShellParameters = (
  process: Process,
  arg0: string,
  args: string[],
) => {
  const { variables } = process
  variables.set('$', process.pid.toString(), { exported: false })
  variables.set('?', '0', { exported: false })
  variables.set('!', '', { exported: false })
  variables.set('0', arg0, { exported: false })
  variables.set('-', '', { exported: false })
  variables.set('_', arg0, { exported: false })
  setPositionalParameters(process, args)
}

const createSecondsVariable = (
  now: () => number,
  initialValue = 0,
): DynamicShellVariable => {
  let anchorMs = now()
  let anchorValue = initialValue
  const get = () => Math.floor(anchorValue + (now() - anchorMs) / 1_000).toString()
  return {
    get,
    set: (value) => {
      const parsed = Number(value)
      anchorValue = Number.isFinite(parsed) ? parsed : 0
      anchorMs = now()
    },
    clone: () => createSecondsVariable(now, Number(get())),
  }
}

export const initializeTimeParameters = (process: Process) => {
  const { time } = process.ctx
  const monotonicNow = () => time?.monotonic.nowMs() ?? performance.now()
  const gameNow = () => time?.game.nowMs() ?? Date.now()
  process.variables.defineDynamic('SECONDS', createSecondsVariable(monotonicNow))
  process.variables.defineDynamic('EPOCHSECONDS', {
    get: () => Math.floor(gameNow() / 1_000).toString(),
  })
  process.variables.defineDynamic('EPOCHREALTIME', {
    get: () => (gameNow() / 1_000).toFixed(6),
  })
  process.variables.makeReadonly('EPOCHSECONDS')
  process.variables.makeReadonly('EPOCHREALTIME')
}

export const updateLastArgument = (
  process: Process,
  command: { name: string, args: string[] },
) => {
  process.variables.set('_', command.args.at(- 1) ?? command.name, { exported: false })
}
