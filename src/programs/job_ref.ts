export const parseJobId = (value: string, allowBare = false) => {
  if (! value.startsWith('%') && ! allowBare) return null
  const id = Number(value.startsWith('%') ? value.slice(1) : value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
