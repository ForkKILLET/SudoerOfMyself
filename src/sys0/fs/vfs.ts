import { File, FileT, DirEntries, InodeMaintainer, Inode, FileFromT, FOp } from '.'

export namespace Vfs {
  export interface DirVfile {
    type: FileT.DIR
    children: Record<string, Vfile>
  }
  export interface NormalVfile {
    type: FileT.NORMAL
    content: string
  }
  export interface JsExeVfile {
    type: FileT.JSEXE
    programName: string
  }
  export type Vfile =
    | DirVfile
    | NormalVfile
    | JsExeVfile

  export const dir = (children: Record<string, Vfile> = {}): DirVfile => {
    return {
      type: FileT.DIR,
      children,
    }
  }

  export const normal = (content: string): NormalVfile => ({
    type: FileT.NORMAL,
    content,
  })

  export const jsExe = (programName: string): JsExeVfile => ({
    type: FileT.JSEXE,
    programName,
  })

  interface FsBuildStep {
    vfile: Vfile
    entries: DirEntries
    name: string
  }

  export const create = <FB extends Vfile>(
    fs: InodeMaintainer,
    vroot: FB,
  ): FOp.CreateResult<FileFromT<FB['type']>> => {
    const queue: FsBuildStep[] = [{ vfile: vroot, entries: {}, name: '' }]
    const allocatedIids: number[] = []
    let rootInode: Inode | undefined

    while (queue.length) {
      const step = queue.shift()
      if (! step) break
      const { vfile: tree, entries, name } = step

      let file: File
      if (tree.type === FileT.DIR) {
        file = {
          type: FileT.DIR,
          entries: {},
        }
        for (const [name, child] of Object.entries(tree.children)) {
          queue.push({ vfile: child, entries: file.entries, name })
        }
      }
      else {
        file = tree
      }

      // TODO: optimize
      const iid = fs.inodeBitmap.getFree(1)
      if (iid === - 1) {
        allocatedIids.forEach((allocatedIid) => {
          fs.inodes.delete(allocatedIid)
          fs.inodeBitmap.set(allocatedIid, 0)
        })
        return FOp.err({ type: FOp.T.OUT_OF_INODES })
      }

      const inode: Inode = { iid, file }
      allocatedIids.push(iid)
      fs.inodes.set(iid, inode)
      if (! rootInode) rootInode = inode
      entries[name] = iid
    }

    if (! rootInode) throw new Error('VFS image produced no root inode')
    return FOp.ok({ inode: rootInode as Inode<FileFromT<FB['type']>> })
  }
}
