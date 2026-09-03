import {
  File,
  FileT,
  DirEntries,
  InodeMaintainer,
  Inode,
  FileFromT,
  FOp,
} from '.'
import { ROOT_GROUP_ID, ROOT_USER_ID, type GroupId, type UserId } from '../identity'
import {
  applyUmask,
  DEFAULT_DIRECTORY_MODE,
  DEFAULT_FILE_MODE,
  type UnixMode,
} from './permissions'
import { createSysExecutableContent } from '../executable_format'

export namespace Vfs {
  export interface VfileMetadata {
    uid?: UserId
    gid?: GroupId
    mode?: UnixMode
  }
  export interface DirVfile extends VfileMetadata {
    type: FileT.DIR
    children: Record<string, Vfile>
  }
  export interface NormalVfile extends VfileMetadata {
    type: FileT.NORMAL
    content: string
  }
  export type Vfile =
    | DirVfile
    | NormalVfile

  export const dir = (
    children: Record<string, Vfile> = {},
    metadata: VfileMetadata = {},
  ): DirVfile => {
    return {
      type: FileT.DIR,
      children,
      ...metadata,
    }
  }

  export const normal = (content: string, metadata: VfileMetadata = {}): NormalVfile => ({
    type: FileT.NORMAL,
    content,
    ...metadata,
  })

  export const sysExe = (programId: string, metadata: VfileMetadata = {}): NormalVfile => ({
    type: FileT.NORMAL,
    content: createSysExecutableContent(programId),
    mode: 0o751,
    ...metadata,
  })

  export interface CreationContext {
    uid: UserId
    gid: GroupId
    umask: UnixMode
  }

  export const ROOT_CREATION_CONTEXT: CreationContext = {
    uid: ROOT_USER_ID,
    gid: ROOT_GROUP_ID,
    umask: 0o022,
  }

  interface FsBuildStep {
    vfile: Vfile
    entries: DirEntries
    name: string
    uid: UserId
    gid: GroupId
  }

  export const create = <FB extends Vfile>(
    fs: InodeMaintainer,
    vroot: FB,
    timestamp: number,
    creation: CreationContext = ROOT_CREATION_CONTEXT,
  ): FOp.CreateResult<FileFromT<FB['type']>> => {
    const queue: FsBuildStep[] = [{
      vfile: vroot,
      entries: {},
      name: '',
      uid: creation.uid,
      gid: creation.gid,
    }]
    const createdInodes: Inode[] = []
    let rootInode: Inode | undefined

    while (queue.length) {
      const step = queue.shift()
      if (! step) break
      const { vfile: tree, entries, name } = step
      const uid = tree.uid ?? step.uid
      const gid = tree.gid ?? step.gid

      let file: File
      if (tree.type === FileT.DIR) {
        file = {
          type: FileT.DIR,
          entries: {},
        }
        for (const [name, child] of Object.entries(tree.children)) {
          queue.push({ vfile: child, entries: file.entries, name, uid, gid })
        }
      }
      else {
        file = {
          type: FileT.NORMAL,
          content: tree.content,
        }
      }

      // TODO: optimize
      const iid = fs.inodeBitmap.getFree(1)
      if (iid === - 1) {
        createdInodes.forEach((createdInode) => {
          fs.inodes.delete(createdInode.iid)
          fs.inodeBitmap.set(createdInode.iid, 0)
        })
        return FOp.err({ type: FOp.T.OUT_OF_INODES })
      }

      const inode: Inode = {
        iid,
        file,
        metadata: {
          createdAt: timestamp,
          modifiedAt: timestamp,
          uid,
          gid,
          mode: applyUmask(
            tree.mode ?? (tree.type === FileT.DIR ? DEFAULT_DIRECTORY_MODE : DEFAULT_FILE_MODE),
            creation.umask,
          ),
        },
      }
      createdInodes.push(inode)
      fs.inodes.set(iid, inode)
      if (! rootInode) rootInode = inode
      entries[name] = iid
    }

    if (! rootInode) throw new Error('VFS image produced no root inode')
    return FOp.ok({
      inode: rootInode as Inode<FileFromT<FB['type']>>,
      createdInodes,
    })
  }
}
