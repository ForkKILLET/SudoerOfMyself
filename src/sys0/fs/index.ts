import { Context } from '@/sys0/context'
import { ProgramName } from '@/programs'
import { getSysImage } from '@/data/sys_image'
import { IAbortable, Stack } from '@/utils'
import { Bitmap } from '@/utils/bitmap'
import { Awaitable, DistributiveOmit, Pred, StrictOmit } from '@/utils/types'

import { FileMode, FileHandleFromMode, FILE_HANDLE_FROM_MODE } from './file_handle'
import { FsPersistence, LocalStorageFsPersistence } from './persistence'
import { Vfs } from './vfs'
import { Path } from './path'

export const enum FileT {
    DIR,
    NORMAL,
    JSEXE,
}

export const FileTNames: Record<FileT, string> = {
    [FileT.DIR]: 'a directory',
    [FileT.NORMAL]: 'a normal file',
    [FileT.JSEXE]: 'a javascript executable',
}

export const displayFileT = (type: FileT) => {
    return FileTNames[type]
}

export type InodeId = number
export interface Inode<F extends File = File> {
    iid: InodeId
    file: F
}
export type Inodes = Map<InodeId, Inode>

export type File =
    | DirFile
    | NormalFile
    | JsExeFile

export interface FileLoc<F extends File = File> {
    path: string
    file: F
}

export interface DirEntries {
    [name: string]: InodeId
}

export interface DirFile {
    type: FileT.DIR
    entries: DirEntries
}

export interface NormalFile {
    type: FileT.NORMAL
    content: string
}

export interface JsExeFile {
    type: FileT.JSEXE
    programName: ProgramName
}

export type FileFromT<FT extends FileT> =
    FT extends FileT.DIR ? DirFile :
    FT extends FileT.NORMAL ? NormalFile :
    FT extends FileT.JSEXE ? JsExeFile :
    never

export interface FReadKeyOptions extends Partial<IAbortable> {}

export interface FRead {
    readKey(options?: FReadKeyOptions): Awaitable<string | null>
    read(): Awaitable<string>
    readUntil(pred: Pred<string>): Awaitable<string>
    readLn(): Awaitable<string>
}

export interface FWrite {
    write(data: string): void
    writeLn(data: string): void
}

export interface FReadWrite extends FRead, FWrite {}

export const MAX_INODE_COUNT = 1024

export interface InodeMaintainer {
    inodes: Inodes
    inodeBitmap: Bitmap
}

export const enum FOpT {
    OK,
    ILLEGAL_NAME,
    NOT_FOUND,
    DANGLING_INODE,
    NOT_DIR,
    NOT_ALLOWED_TYPE,
    ALREADY_EXISTS,
    OUT_OF_INODES,
}

export const kFOpError: unique symbol = Symbol('FOpError')
export type FOpError = { [kFOpError]: true } & (
    | { type: FOpT.ILLEGAL_NAME }
    | { type: FOpT.NOT_FOUND }
    | { type: FOpT.DANGLING_INODE }
    | { type: FOpT.NOT_DIR }
    | { type: FOpT.NOT_ALLOWED_TYPE, allowedTypes: readonly FileT[] }
    | { type: FOpT.ALREADY_EXISTS }
    | { type: FOpT.OUT_OF_INODES }
)
export const fOpErr = <E extends DistributiveOmit<FOpError, typeof kFOpError>>(
    err: E
): FOpError => ({
    [kFOpError]: true,
    ...err
})
export const fOpIsErr = <T>(res: FOpResult<T>): res is FOpError => res.type !== FOpT.OK
export const fOpIsOk = <T>(res: FOpResult<T>): res is FOpOk<T> => res.type === FOpT.OK

export type FOpOk<T> = { type: FOpT.OK } & T
export type FOpResult<T> = FOpOk<T> | FOpError

export type FFindInodeResult<F extends File = File> = FOpResult<{
    inode: Inode<F>
    path: string
}>
export type FFindResult<F extends File = File> = FOpResult<{
    file: F
    path: string
}>
export type FMkdirResult = FOpResult<{ dir: DirFile }>
export type FReadResult = FOpResult<{ content: string }>
export type FOpenResult<FM extends FileMode> = FOpResult<{ handle: FileHandleFromMode<FM> }>
export type FCreateResult<F extends File = File> = FOpResult<{ inode: Inode<F> }>

export interface FindOptions<FT extends FileT = FileT> {
    allowedTypes?: readonly FT[]
}

export type FOpMethod = 'find' | 'mkdir' | 'read'

export class Fs {
    inodes: Inodes = new Map()
    inodeBitmap: Bitmap = new Bitmap(MAX_INODE_COUNT)
    rootIid = 1
    get root() {
        return this.inodes.get(this.rootIid)!
    }

    persistence: FsPersistence = new LocalStorageFsPersistence()

    constructor(public ctx: Context) {
        this.load()
    }

    reset() {
        this.persistence.isInitialized = false
        this.inodes.clear()
        this.inodeBitmap.clear()
        this.load()
    }

    load() {
        if (! this.persistence.isInitialized) {
            this.create(getSysImage())
            this.inodes.forEach((inode, iid) => {
                this.persistence.set(iid, inode)
            })
            this.persistence.isInitialized = true
        }
        else {
            this.persistence.getAll().forEach(([ iid, inode ]) => {
                this.inodes.set(iid, inode)
                this.inodeBitmap.bits[iid] = 1
            })
        }
    }

    get cwd() {
        return this.ctx.fgProc.cwd
    }

    isFileOfType<FT extends FileT>(file: File, types: readonly FT[]): file is FileFromT<FT> {
        return types.includes(file.type)
    }
    isInodeOfType<FT extends FileT>(inode: Inode, types: readonly FT[]): inode is Inode<FileFromT<FT>> {
        return this.isFileOfType(inode.file, types)
    }

    create<FB extends Vfs.Vfile>(tree: FB): FCreateResult<FileFromT<FB["type"]>> {
        return Vfs.create(this, tree)
    }

    createAt<FB extends Vfs.Vfile>(parent: Inode<DirFile>, name: string, tree: FB): FCreateResult<FileFromT<FB["type"]>> {
        const createRes = this.create(tree)
        if (fOpIsErr(createRes)) return createRes

        parent.file.entries[name] = createRes.inode.iid
        this.persistence.set(parent.iid, parent)
        return createRes
    }

    unwrap<T>(res: FOpResult<T>, errHead: string): FOpOk<T> {
        if (! (kFOpError in res)) return res

        switch (res.type) {
        case FOpT.ILLEGAL_NAME:
            throw `${errHead}: Illegal file name`
        case FOpT.NOT_FOUND:
            throw `${errHead}: No such file or directory`
        case FOpT.DANGLING_INODE:
            throw `${errHead}: Dangling Inode`
        case FOpT.NOT_DIR:
            throw `${errHead}: Not a directory`
        case FOpT.NOT_ALLOWED_TYPE:
            throw `${errHead}: Not ${res.allowedTypes.map(displayFileT).join(' or ')}`
        case FOpT.ALREADY_EXISTS:
            throw `${errHead}: File already exists`
        case FOpT.OUT_OF_INODES:
            throw `${errHead}: Out of Inodes`
        }
    }

    findInode<FT extends FileT = FileT>(
        path: string,
        { allowedTypes }: FindOptions<FT> = {}
    ): FFindInodeResult<FileFromT<FT>> {
        let path1 = path
        if (! Path.isAbsOrRel(path1)) path1 = `./${path1}`
        const parts = Path.split(path1)

        if (parts[0] === '.' || parts[0] === '..') {
            parts.unshift(...Path.split(this.cwd))
        }
        if (! parts[0]) parts.shift()

        const inodeStack = new Stack(this.root)
        const partStack = new Stack('')

        for (const part of parts) {
            const { file } = inodeStack.top
            if (file.type !== FileT.DIR) return fOpErr({ type: FOpT.NOT_DIR })
            if (part === '.') continue
            if (part === '..') {
                if (inodeStack.length > 1) {
                    inodeStack.pop()
                    partStack.pop()
                }
                continue
            }
            if (! (part in file.entries)) return fOpErr({ type: FOpT.NOT_FOUND })
            const inode = this.inodes.get(file.entries[part])
            if (! inode) return fOpErr({ type: FOpT.NOT_FOUND })
            inodeStack.push(inode)
            partStack.push(part)
        }

        const inode = inodeStack.top
        if (allowedTypes && ! this.isInodeOfType(inode, allowedTypes)) {
            return fOpErr({ type: FOpT.NOT_ALLOWED_TYPE, allowedTypes })
        }

        return {
            type: FOpT.OK,
            inode: inode as Inode<FileFromT<FT>>,
            path: Path.joinAbs(partStack),
        }
    }

    find<FT extends FileT = FileT>(
        path: string,
        { allowedTypes }: FindOptions<FT> = {}
    ): FFindResult<FileFromT<FT>> {
        const res = this.findInode(path, { allowedTypes })
        if (fOpIsErr(res)) return res
        return {
            type: FOpT.OK,
            file: res.inode.file,
            path: res.path,
        }
    }

    getFileByIid(iid: InodeId): File | null {
        const inode = this.inodes.get(iid)
        if (! inode) return null
        return inode.file
    }

    getChild(dir: DirFile, childName: string) {
        if (! (childName in dir.entries)) return null
        const iid = dir.entries[childName]
        return this.getFileByIid(iid)
    }

    findU<FT extends FileT = FileT>(path: string, options: FindOptions<FT> = {}) {
        return this.unwrap(this.find(path, options), `${path}`)
    }

    findInEnvPath(
        path: string,
        envPath: string,
        options?: StrictOmit<FindOptions, 'allowedTypes'>
    ): FFindResult<JsExeFile> {
        if (Path.hasSlash(path)) return this.find(path, { ...options, allowedTypes: [ FileT.JSEXE ] })

        const envPathList = envPath.split(':').filter(Boolean)
        for (const envPath of envPathList) {
            const entry = this.find(`${envPath}/${path}`, { allowedTypes: [ FileT.JSEXE ] })
            if (entry.type === FOpT.OK) return entry
        }
        return fOpErr({ type: FOpT.NOT_FOUND })
    }

    mkdir(path: string): FMkdirResult {
        const { dirname, filename } = Path.getDirAndName(path)
        if (! Path.isLegalFilename(filename)) return fOpErr({ type: FOpT.ILLEGAL_NAME })

        const dirRes = this.findInode(dirname, { allowedTypes: [ FileT.DIR ] })
        if (fOpIsErr(dirRes)) return dirRes
        const { inode: parentInode } = dirRes
        if (parentInode.file.entries[filename]) return fOpErr({ type: FOpT.ALREADY_EXISTS })

        const createRes = this.createAt(parentInode, filename, Vfs.dir())
        if (fOpIsErr(createRes)) return createRes

        const { inode } = createRes
        return {
            type: FOpT.OK,
            dir: inode.file,
        }
    }

    mkdirU(path: string) {
        return this.unwrap(this.mkdir(path), `Cannot create directory ${path}`)
    }

    private createFileHandle<FM extends FileMode>(inode: Inode<NormalFile>, mode: FM): FileHandleFromMode<FM> {
        const Handle = FILE_HANDLE_FROM_MODE[mode]
        return new Handle(this.ctx, inode) as FileHandleFromMode<FM>
    }

    open<FM extends FileMode>(path: string, mode: FM): FOpenResult<FM> {
        const res = this.findInode(path, { allowedTypes: [ FileT.NORMAL ] })

        let inode: Inode<NormalFile>
        if (fOpIsErr(res)) {
            if (mode === 'r' || res.type === FOpT.NOT_ALLOWED_TYPE) return res
            const { dirname, filename } = Path.getDirAndName(path)

            if (! filename) return fOpErr({ type: FOpT.ILLEGAL_NAME })

            const dirRes = this.findInode(dirname, { allowedTypes: [ FileT.DIR ] })
            if (fOpIsErr(dirRes)) return dirRes

            const { inode: parentInode } = dirRes
            const createRes = this.createAt(parentInode, filename, Vfs.normal(''))
            if (fOpIsErr(createRes)) return createRes
            inode = createRes.inode as Inode<NormalFile>
        }
        else {
            inode = res.inode
        }

        return {
            type: FOpT.OK,
            handle: this.createFileHandle(inode, mode),
        }
    }

    openU<FM extends FileMode>(path: string, mode: FM) {
        return this.unwrap(this.open(path, mode), path)
    }
}
