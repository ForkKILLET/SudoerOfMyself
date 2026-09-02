export interface ProcessUsage {
  userMs: number
  systemMs: number
  blockedMs: number
}

export const emptyProcessUsage = (): ProcessUsage => ({
  userMs: 0,
  systemMs: 0,
  blockedMs: 0,
})

export const addProcessUsage = (
  left: ProcessUsage,
  right: ProcessUsage,
): ProcessUsage => ({
  userMs: left.userMs + right.userMs,
  systemMs: left.systemMs + right.systemMs,
  blockedMs: left.blockedMs + right.blockedMs,
})

const normalizedDuration = (milliseconds: number) => (
  Number.isFinite(milliseconds) ? Math.max(0, milliseconds) : 0
)

export class ProcessAccounting {
  private readonly self = emptyProcessUsage()
  private readonly children = emptyProcessUsage()

  addUser(milliseconds: number) {
    this.self.userMs += normalizedDuration(milliseconds)
  }

  addSystem(milliseconds: number) {
    this.self.systemMs += normalizedDuration(milliseconds)
  }

  addBlocked(milliseconds: number) {
    this.self.blockedMs += normalizedDuration(milliseconds)
  }

  addChild(usage: ProcessUsage) {
    const total = addProcessUsage(this.children, usage)
    Object.assign(this.children, total)
  }

  get selfUsage(): ProcessUsage {
    return { ...this.self }
  }

  get childUsage(): ProcessUsage {
    return { ...this.children }
  }

  get totalUsage(): ProcessUsage {
    return addProcessUsage(this.self, this.children)
  }
}
