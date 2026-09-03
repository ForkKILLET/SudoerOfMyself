import { FileT, type Inode, type NormalFile } from './fs'
import { parseSysExecutable, type SysExecutable } from './executable_format'

export * from './executable_format'

export const loadSysExecutable = (inode: Inode): SysExecutable | undefined => {
  if (inode.file.type !== FileT.NORMAL) return undefined
  return parseSysExecutable(inode.file.content)
}

export const hasExecuteBit = (inode: Inode<NormalFile>) => (
  (inode.metadata.mode & 0o111) !== 0
)
