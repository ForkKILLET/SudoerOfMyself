import { ProgramName } from '@/programs'
import { File, FileT, DirEntries, InodeMaintainer, Inode, FileFromT, FCreateResult, FOpT, fOpErr } from '.'

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
        programName: ProgramName
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

    export const jsExe = (programName: ProgramName): JsExeVfile => ({
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
    ): FCreateResult<FileFromT<FB['type']>> => {
        const queue: FsBuildStep[] = [ { vfile: vroot, entries: {}, name: '' } ]
        let rootInode: Inode | undefined

        while (queue.length) {
            const { vfile: tree, entries, name } = queue.shift()!

            let file: File
            if (tree.type === FileT.DIR) {
                file = {
                    type: FileT.DIR,
                    entries: {}
                }
                for (const [ name, child ] of Object.entries(tree.children)) {
                    queue.push({ vfile: child, entries: file.entries, name })
                }
            }
            else {
                file = tree
            }

            // TODO: optimize
            const iid = fs.inodeBitmap.getFree(1)
            if (iid === - 1) return fOpErr({ type: FOpT.OUT_OF_INODES })

            const inode: Inode = { iid, file }
            fs.inodes.set(iid, inode)
            if (! rootInode) rootInode = inode
            entries[name] = iid
        }

        return {
            type: FOpT.OK,
            inode: rootInode as Inode<FileFromT<FB['type']>>
        }
    }
}