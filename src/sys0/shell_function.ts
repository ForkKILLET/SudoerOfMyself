import type { Program } from './program'

export class ShellFunctions {
  private readonly values = new Map<string, Program>()

  constructor(entries: Iterable<readonly [string, Program]> = []) {
    for (const [name, program] of entries) this.values.set(name, program)
  }

  clone() {
    return new ShellFunctions(this.values)
  }

  get(name: string) {
    return this.values.get(name)
  }

  has(name: string) {
    return this.values.has(name)
  }

  set(name: string, program: Program) {
    this.values.set(name, program)
  }

  delete(name: string) {
    return this.values.delete(name)
  }

  names() {
    return [...this.values.keys()]
  }
}
