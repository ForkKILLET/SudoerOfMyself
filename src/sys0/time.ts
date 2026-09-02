export interface MonotonicClock {
  nowMs(): number
}

export interface HostClock {
  nowMs(): number
}

export const performanceMonotonicClock: MonotonicClock = {
  nowMs: () => performance.now(),
}

export const systemHostClock: HostClock = {
  nowMs: () => Date.now(),
}

export interface GameClockState {
  worldTimeMs: number
  rate: number
  running: boolean
  timezone: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
)

export const assertGameClockState: (value: unknown) => asserts value is GameClockState = (value) => {
  if (! isRecord(value)) throw new TypeError('Invalid game-clock state')
  validateFinite(value.worldTimeMs as number, 'Game time')
  validateFinite(value.rate as number, 'Game clock rate')
  if ((value.rate as number) < 0) throw new RangeError('Game clock rate cannot be negative')
  if (typeof value.running !== 'boolean') throw new TypeError('Invalid game-clock running state')
  if (typeof value.timezone !== 'string' || ! value.timezone) {
    throw new TypeError('Invalid game-clock timezone')
  }
}

export const DEFAULT_GAME_CLOCK_STATE: Readonly<GameClockState> = {
  worldTimeMs: Date.parse('2099-07-13T23:30:05.000Z'),
  rate: 1,
  running: true,
  timezone: 'UTC',
}

export type GameClockListener = (state: GameClockState) => void

const validateFinite = (value: number, name: string) => {
  if (! Number.isFinite(value)) throw new RangeError(`${name} must be finite`)
}

export class GameClock {
  private anchorWorldTimeMs: number
  private anchorMonotonicMs: number
  private _rate: number
  private _running: boolean
  private _timezone: string
  private readonly listeners = new Set<GameClockListener>()

  constructor(
    private readonly monotonic: MonotonicClock,
    state: GameClockState = { ...DEFAULT_GAME_CLOCK_STATE },
  ) {
    validateFinite(state.worldTimeMs, 'Game time')
    this.validateRate(state.rate)
    if (! state.timezone) throw new RangeError('Game timezone cannot be empty')
    this.anchorWorldTimeMs = state.worldTimeMs
    this.anchorMonotonicMs = monotonic.nowMs()
    this._rate = state.rate
    this._running = state.running
    this._timezone = state.timezone
  }

  nowMs() {
    if (! this._running) return this.anchorWorldTimeMs
    const elapsed = Math.max(0, this.monotonic.nowMs() - this.anchorMonotonicMs)
    return this.anchorWorldTimeMs + elapsed * this._rate
  }

  get rate() {
    return this._rate
  }

  get running() {
    return this._running
  }

  get timezone() {
    return this._timezone
  }

  snapshot(): GameClockState {
    return {
      worldTimeMs: this.nowMs(),
      rate: this._rate,
      running: this._running,
      timezone: this._timezone,
    }
  }

  checkpoint() {
    this.reanchor(this.nowMs())
    return this.snapshot()
  }

  advanceBy(milliseconds: number) {
    validateFinite(milliseconds, 'Game time advance')
    if (milliseconds < 0) throw new RangeError('Game time cannot advance by a negative duration')
    this.reanchor(this.nowMs() + milliseconds)
    this.emitChange()
  }

  advanceTo(worldTimeMs: number) {
    validateFinite(worldTimeMs, 'Game time')
    if (worldTimeMs < this.nowMs()) throw new RangeError('Game time cannot advance backwards')
    this.reanchor(worldTimeMs)
    this.emitChange()
  }

  setRate(rate: number) {
    this.validateRate(rate)
    if (rate === this._rate) return
    this.reanchor(this.nowMs())
    this._rate = rate
    this.emitChange()
  }

  setTimezone(timezone: string) {
    if (! timezone) throw new RangeError('Game timezone cannot be empty')
    if (timezone === this._timezone) return
    this._timezone = timezone
    this.emitChange()
  }

  pause() {
    if (! this._running) return
    this.reanchor(this.nowMs())
    this._running = false
    this.emitChange()
  }

  resume() {
    if (this._running) return
    this.reanchor(this.anchorWorldTimeMs)
    this._running = true
    this.emitChange()
  }

  onChange(listener: GameClockListener) {
    this.listeners.add(listener)
    return {
      dispose: () => this.listeners.delete(listener),
    }
  }

  private reanchor(worldTimeMs: number) {
    this.anchorWorldTimeMs = worldTimeMs
    this.anchorMonotonicMs = this.monotonic.nowMs()
  }

  private emitChange() {
    const state = this.snapshot()
    this.listeners.forEach(listener => listener(state))
  }

  private validateRate(rate: number) {
    validateFinite(rate, 'Game clock rate')
    if (rate < 0) throw new RangeError('Game clock rate cannot be negative')
  }
}

export interface TimeServiceOptions {
  monotonic?: MonotonicClock
  host?: HostClock
  gameState?: GameClockState
}

export class TimeService {
  readonly monotonic: MonotonicClock
  readonly host: HostClock
  readonly game: GameClock

  constructor({
    monotonic = performanceMonotonicClock,
    host = systemHostClock,
    gameState,
  }: TimeServiceOptions = {}) {
    this.monotonic = monotonic
    this.host = host
    this.game = new GameClock(monotonic, gameState)
  }
}
