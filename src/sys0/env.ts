export interface Env {
  [key: string]: string
}

export const createEnv = (env: Env): Env => ({ ...env })

export const getEnv = (env: Env, name: string) => env[name] ?? ''

export const isEnvName = (name: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)

export interface SetShellVariableOptions {
  exported?: boolean
}

export class ShellVariables {
  readonly values: Env
  private readonly exportedNames: Set<string>

  constructor(values: Env = {}, exportedNames: Iterable<string> = Object.keys(values)) {
    this.values = createEnv(values)
    this.exportedNames = new Set(exportedNames)
  }

  clone() {
    return new ShellVariables(this.values, this.exportedNames)
  }

  has(name: string) {
    return Object.hasOwn(this.values, name)
  }

  isExported(name: string) {
    return this.has(name) && this.exportedNames.has(name)
  }

  set(name: string, value: string, { exported }: SetShellVariableOptions = {}) {
    this.values[name] = value
    if (exported === true) this.exportedNames.add(name)
    else if (exported === false) this.exportedNames.delete(name)
  }

  export(name: string) {
    this.values[name] ??= ''
    this.exportedNames.add(name)
  }

  unexport(name: string) {
    this.exportedNames.delete(name)
  }

  unset(name: string) {
    delete this.values[name]
    this.exportedNames.delete(name)
  }

  environment(): Env {
    return Object.fromEntries(
      [...this.exportedNames]
        .filter(name => this.has(name))
        .map(name => [name, this.values[name]]),
    )
  }

  exportedEntries() {
    return Object.entries(this.environment())
  }
}
