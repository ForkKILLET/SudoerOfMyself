export const SYS_EXECUTABLE_MAGIC = '#!sys'

export interface SysExecutable {
  format: 'sys'
  programId: string
}

export const createSysExecutableContent = (programId: string) => (
  `${SYS_EXECUTABLE_MAGIC}\n${programId}\n`
)

export const parseSysExecutable = (content: string): SysExecutable | undefined => {
  const lines = content.split(/\r?\n/u)
  if (lines[0] !== SYS_EXECUTABLE_MAGIC) return undefined
  const programId = lines[1]
  if (! programId || ! /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/u.test(programId)) return undefined
  if (lines.slice(2).some(Boolean)) return undefined
  return { format: 'sys', programId }
}
