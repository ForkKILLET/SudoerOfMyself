import type { Process } from '@/sys0/proc'
import { normalExit, ProcessExit } from '@/sys0/process_exit'

const EXIT_REQUESTS = new WeakMap<Process, ProcessExit>()

export interface ReturnFrame {
  returnStatus?: ProcessExit
}

const RETURN_FRAMES = new WeakMap<Process, ReturnFrame[]>()

export type LoopControlType = 'break' | 'continue'

interface LoopControlRequest {
  type: LoopControlType
  levels: number
}

const LOOP_DEPTHS = new WeakMap<Process, number>()
const LOOP_CONTROL_REQUESTS = new WeakMap<Process, LoopControlRequest>()

export const requestShellExit = (process: Process, code: number) => {
  const exitStatus = normalExit(code)
  EXIT_REQUESTS.set(process, exitStatus)
  return exitStatus
}

export const getShellExitRequest = (process: Process) => EXIT_REQUESTS.get(process)

export const enterReturnContext = (process: Process) => {
  const frame: ReturnFrame = {}
  const frames = RETURN_FRAMES.get(process) ?? []
  frames.push(frame)
  RETURN_FRAMES.set(process, frames)
  return frame
}

export const leaveReturnContext = (process: Process, frame: ReturnFrame) => {
  const frames = RETURN_FRAMES.get(process)
  if (frames?.at(- 1) !== frame) throw new Error('Return frames must be left in stack order')
  frames.pop()
  if (! frames.length) RETURN_FRAMES.delete(process)
  return frame.returnStatus
}

export const isInReturnContext = (process: Process) => Boolean(RETURN_FRAMES.get(process)?.length)

export const requestReturn = (process: Process, code: number) => {
  const frame = RETURN_FRAMES.get(process)?.at(- 1)
  if (! frame) return undefined
  const returnStatus = normalExit(code)
  frame.returnStatus = returnStatus
  return returnStatus
}

export const getReturnRequest = (process: Process) => (
  RETURN_FRAMES.get(process)?.at(- 1)?.returnStatus
)

export const enterShellLoop = (process: Process) => {
  LOOP_DEPTHS.set(process, (LOOP_DEPTHS.get(process) ?? 0) + 1)
}

export const leaveShellLoop = (process: Process) => {
  const depth = LOOP_DEPTHS.get(process) ?? 0
  if (depth <= 1) LOOP_DEPTHS.delete(process)
  else LOOP_DEPTHS.set(process, depth - 1)
}

export const requestLoopControl = (
  process: Process,
  type: LoopControlType,
  levels: number,
) => {
  const depth = LOOP_DEPTHS.get(process) ?? 0
  if (! depth) return false
  LOOP_CONTROL_REQUESTS.set(process, {
    type,
    levels: Math.min(levels, depth),
  })
  return true
}

export const getLoopControlRequest = (process: Process) => (
  LOOP_CONTROL_REQUESTS.get(process)
)

export type LoopBoundaryAction = LoopControlType | 'propagate'

export const consumeLoopControlAtBoundary = (process: Process): LoopBoundaryAction | undefined => {
  const request = LOOP_CONTROL_REQUESTS.get(process)
  if (! request) return undefined
  if (request.levels > 1) {
    request.levels --
    return 'propagate'
  }
  LOOP_CONTROL_REQUESTS.delete(process)
  return request.type
}
