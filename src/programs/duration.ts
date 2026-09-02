export const parseDurationMilliseconds = (source: string) => {
  const match = /^(\d+(?:\.\d*)?|\.\d+)([smhd]?)$/.exec(source)
  if (! match) return null
  const value = Number(match[1])
  const multipliers = new Map([
    ['', 1_000],
    ['s', 1_000],
    ['m', 60_000],
    ['h', 3_600_000],
    ['d', 86_400_000],
  ])
  const milliseconds = value * (multipliers.get(match[2]) ?? Number.NaN)
  return Number.isFinite(milliseconds) ? milliseconds : null
}
