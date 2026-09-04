export const parseShellStatus = (value: string) => {
  if (! /^[+-]?\d+$/.test(value)) return null
  const code = BigInt(value)
  return Number((code % 256n + 256n) % 256n)
}
