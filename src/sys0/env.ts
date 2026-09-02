import { UserError } from '@/utils/errors'

export interface Env {
  [key: string]: string
}

export const createEnv = (env: Env): Env => ({ ...env })

export const getEnv = (env: Env, name: string) => env[name] ?? ''

export const isEnvName = (name: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)

export interface SetShellVariableOptions {
  exported?: boolean
}

export interface ShellVariableSnapshot {
  exists: boolean
  value?: string
  exported: boolean
  readonly: boolean
}

export class ShellVariables {
  readonly values: Env
  private readonly exportedNames: Set<string>
  private readonly readonlyNames: Set<string>

  constructor(
    values: Env = {},
    exportedNames: Iterable<string> = Object.keys(values),
    readonlyNames: Iterable<string> = [],
  ) {
    this.values = createEnv(values)
    this.exportedNames = new Set(exportedNames)
    this.readonlyNames = new Set(readonlyNames)
  }

  clone() {
    return new ShellVariables(this.values, this.exportedNames, this.readonlyNames)
  }

  has(name: string) {
    return Object.hasOwn(this.values, name)
  }

  isExported(name: string) {
    return this.has(name) && this.exportedNames.has(name)
  }

  isReadonly(name: string) {
    return this.has(name) && this.readonlyNames.has(name)
  }

  set(name: string, value: string, { exported }: SetShellVariableOptions = {}) {
    if (this.isReadonly(name)) throw new UserError(`${name}: readonly variable`)
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
    if (this.isReadonly(name)) throw new UserError(`${name}: readonly variable`)
    delete this.values[name]
    this.exportedNames.delete(name)
    this.readonlyNames.delete(name)
  }

  makeReadonly(name: string) {
    this.values[name] ??= ''
    this.readonlyNames.add(name)
  }

  snapshot(name: string): ShellVariableSnapshot {
    return {
      exists: this.has(name),
      value: this.values[name],
      exported: this.isExported(name),
      readonly: this.isReadonly(name),
    }
  }

  restore(name: string, snapshot: ShellVariableSnapshot) {
    if (! snapshot.exists) {
      delete this.values[name]
      this.exportedNames.delete(name)
      this.readonlyNames.delete(name)
      return
    }
    this.values[name] = snapshot.value ?? ''
    if (snapshot.exported) this.exportedNames.add(name)
    else this.exportedNames.delete(name)
    if (snapshot.readonly) this.readonlyNames.add(name)
    else this.readonlyNames.delete(name)
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

  readonlyEntries() {
    return Object.entries(this.values).filter(([name]) => this.isReadonly(name))
  }
}
