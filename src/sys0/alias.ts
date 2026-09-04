export class ShellAliases {
  private readonly values = new Map<string, string>()

  constructor(entries: Iterable<readonly [string, string]> = []) {
    for (const [name, value] of entries) this.values.set(name, value)
  }

  clone() {
    return new ShellAliases(this.values)
  }

  get(name: string) {
    return this.values.get(name)
  }

  has(name: string) {
    return this.values.has(name)
  }

  set(name: string, value: string) {
    this.values.set(name, value)
  }

  delete(name: string) {
    return this.values.delete(name)
  }

  clear() {
    this.values.clear()
  }

  names() {
    return [...this.values.keys()]
  }

  entries() {
    return [...this.values.entries()]
  }
}

export const isAliasName = (name: string) => (
  name.length > 0 && ! /[\s=|&;<>]/u.test(name)
)

export const quoteAliasValue = (value: string) => (
  `'${value.replaceAll('\'', String.raw`'\''`)}'`
)

export const formatAlias = (name: string, value: string) => `${name}=${quoteAliasValue(value)}`
