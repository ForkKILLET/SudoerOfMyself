import { FileT, FOp, type Inode } from '@/sys0/fs'
import { Path } from '@/sys0/fs/path'
import type { Process } from '@/sys0/proc'
import { errorMessage } from '@/utils/errors'

export type FileAction = (path: string, inode: Inode) => FOp.OperationResult<unknown>

export const applyToPaths = (
  proc: Process,
  paths: readonly string[],
  recursive: boolean,
  action: FileAction,
) => {
  const errors: Array<{ path: string, message: string }> = []

  const visit = (path: string) => {
    const found = proc.fs.findInode(path)
    if (found.isErr) {
      errors.push({ path, message: FOp.displayError(found.err) })
      return
    }
    const { inode } = found.val
    if (recursive && inode.file.type === FileT.DIR) {
      try {
        proc.fs.getChildren(inode.file).forEach(({ name }) => {
          visit(Path.join(found.val.path, name))
        })
      }
      catch (error) {
        errors.push({ path, message: errorMessage(error) })
        return
      }
    }
    const result = action(found.val.path, inode)
    if (result.isErr) errors.push({ path, message: FOp.displayError(result.err) })
  }

  paths.forEach(visit)
  return errors
}
