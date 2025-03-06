import { getSysImage } from '@/data/sys_image'
import { Program } from '@/sys0/program'
import { Awaitable, DistributiveOmit, MakeOptional, Pred, StrictOmit } from '@/utils/types'
import { Context } from './context'
import { mixin, Signal, Stack } from '@/utils'
import { Bitmap } from '@/utils/bitmap'

export namespace Path {
    export const hasSlash = (path: string) => path.includes('/')
    export const isAbs = (path: string) => path.startsWith('/')
    export const isRel = (path: string) => path.match(/^\.\.?(\/|$)/)
    export const isAbsOrRel = (path: string) => isAbs(path) || isRel(path)
    export const split = (path: string) => path.split('/').filter(Boolean)
    export const joinAbs = (parts: string[]) => '/' + parts.slice(1).join('/')
    export const getDirAndName = (path: string) => {
        if (! isAbsOrRel(path)) path = `./${path}`
        const parts = split(path)
        const filename = parts.pop()!
        const dirname = parts.join('/')
        return { dirname, filename }
    }
    export const isLegalFilename = (name: string) => !! name && ! name.includes('/')
}

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
export interface Inode<FT extends FileT = FileT> {
    iid: InodeId
    file: FileFromT<FT>
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
    program: Program
}

export type FileFromT<FT extends FileT> =
    FT extends FileT.DIR ? DirFile :
    FT extends FileT.NORMAL ? NormalFile :
    FT extends FileT.JSEXE ? JsExeFile :
    never

export interface FReadKeyOptions {
    abort?: Signal
}

export interface FRead {
    readKey(options?: FReadKeyOptions): Awaitable<string | null>
    read(): Awaitable<string>
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

export namespace FsBuilder {
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
        program: Program
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

    export const jsExe = (program: Program): JsExeVfile => ({
        type: FileT.JSEXE,
        program,
    })

    interface FsBuildStep {
        vfile: Vfile
        entries: DirEntries
        name: string
    }

    export const build = <FB extends Vfile>(
        fs: InodeMaintainer,
        vroot: FB,
    ): Inode<FB['type']> => {
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
            const inode: Inode = { iid, file }
            fs.inodes.set(iid, inode)
            if (! rootInode) rootInode = inode
            entries[name] = iid
        }

        return rootInode as Inode<FB['type']>
    }
}

export const enum FOpT {
    OK,
    ILLEGAL_NAME,
    NOT_FOUND,
    DANGLING_Inode,
    NOT_DIR,
    NOT_ALLOWED_TYPE,
    ALREADY_EXISTS,
}

export const kFOpError: unique symbol = Symbol('FOpError')
export type FOpError = { [kFOpError]: true } & (
    | { type: FOpT.ILLEGAL_NAME }
    | { type: FOpT.NOT_FOUND }
    | { type: FOpT.DANGLING_Inode }
    | { type: FOpT.NOT_DIR }
    | { type: FOpT.NOT_ALLOWED_TYPE, allowedTypes: readonly FileT[] }
    | { type: FOpT.ALREADY_EXISTS }
)
export const fErr = <E extends DistributiveOmit<FOpError, typeof kFOpError>>(
    err: E
): FOpError => ({
    [kFOpError]: true,
    ...err
})

export type FOpOk<T> = { type: FOpT.OK } & T
export type FOpResult<T> = FOpOk<T> | FOpError

export type FFindInodeResult<F extends File = File> = FOpResult<{
    inode: Inode<F['type']>
    path: string
}>
export type FFindResult<F extends File = File> = FOpResult<{
    file: F
    path: string
}>
export type FMkdirResult = FOpResult<{ dir: DirFile }>
export type FReadResult = FOpResult<{ content: string }>
export type FOpenResult<FM extends FileMode> = FOpResult<{ handle: FileHandleFromMode<FM> }>

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

    constructor(public ctx: Context) {
        this.build(getSysImage())
    }

    get cwd() {
        return this.ctx.fgProc.cwd
    }

    isFileOfType<FT extends FileT>(file: File, types: readonly FT[]): file is FileFromT<FT> {
        return types.includes(file.type)
    }
    isInodeOfType<FT extends FileT>(inode: Inode, types: readonly FT[]): inode is Inode<FT> {
        return this.isFileOfType(inode.file, types)
    }

    build<FB extends FsBuilder.Vfile>(tree: FB) {
        return FsBuilder.build(this, tree)
    }

    unwrap<T>(res: FOpResult<T>, errHead: string): FOpOk<T> {
        if (! (kFOpError in res)) return res

        switch (res.type) {
        case FOpT.ILLEGAL_NAME:
            throw `${errHead}: Illegal file name`
        case FOpT.NOT_FOUND:
            throw `${errHead}: No such file or directory`
        case FOpT.DANGLING_Inode:
            throw `${errHead}: Dangling Inode`
        case FOpT.NOT_DIR:
            throw `${errHead}: Not a directory`
        case FOpT.NOT_ALLOWED_TYPE:
            throw `${errHead}: Not ${res.allowedTypes.map(displayFileT).join(' or ')}`
        case FOpT.ALREADY_EXISTS:
            throw `${errHead}: File already exists`
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

        const inodeStack = new Stack(this.root)
        const partStack = new Stack('')

        for (const part of parts) {
            const { file } = inodeStack.top
            if (file.type !== FileT.DIR) return fErr({ type: FOpT.NOT_DIR })
            if (part === '.') continue
            if (part === '..') {
                if (inodeStack.length > 1) {
                    inodeStack.pop()
                    partStack.pop()
                }
                continue
            }
            if (! (part in file.entries)) return fErr({ type: FOpT.NOT_FOUND })
            const inode = this.inodes.get(file.entries[part])
            if (! inode) return fErr({ type: FOpT.NOT_FOUND })
            inodeStack.push(inode)
            partStack.push(part)
        }

        const inode = inodeStack.top
        if (allowedTypes && ! this.isFileOfType(inode.file, allowedTypes)) {
            return fErr({ type: FOpT.NOT_ALLOWED_TYPE, allowedTypes })
        }

        return {
            type: FOpT.OK,
            inode,
            path: Path.joinAbs(partStack),
        }
    }

    find<FT extends FileT = FileT>(
        path: string,
        { allowedTypes }: FindOptions<FT> = {}
    ): FFindResult<FileFromT<FT>> {
        const res = this.findInode(path, { allowedTypes })
        if (res.type !== FOpT.OK) return res
        return {
            type: FOpT.OK,
            file: res.inode.file,
            path: res.path,
        }
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
        return fErr({ type: FOpT.NOT_FOUND })
    }

    mkdir(path: string): FMkdirResult {
        const { dirname, filename } = Path.getDirAndName(path)
        if (! Path.isLegalFilename(filename)) return fErr({ type: FOpT.ILLEGAL_NAME })

        const dirRes = this.find(dirname, { allowedTypes: [ FileT.DIR ] })
        if (dirRes.type !== FOpT.OK) return dirRes
        const { file: parent } = dirRes
        if (parent.entries[filename]) return fErr({ type: FOpT.ALREADY_EXISTS })

        const { iid, file } = this.build(FsBuilder.dir())
        parent.entries[filename] = iid

        return {
            type: FOpT.OK,
            dir: file,
        }
    }

    mkdirU(path: string) {
        return this.unwrap(this.mkdir(path), `Cannot create directory ${path}`)
    }

    private createFileHandle<FM extends FileMode>(file: NormalFile, mode: FM): FileHandleFromMode<FM> {
        type R = FileHandleFromMode<FM>

        switch (mode as FileMode) {
        case 'r':
            return new FileHandleR(file) as R
        case 'w':
            return new FileHandleW(file) as R
        case 'a':
            return new FileHandleA(file) as R
        case 'rw':
            return new FileHandleRW(file) as R
        case 'ra':
            return new FileHandleRA(file) as R
        }
    }

    open<FM extends FileMode>(path: string, mode: FM): FOpenResult<FM> {
        const res = this.find(path, { allowedTypes: [ FileT.NORMAL ] })

        let file: NormalFile
        if (res.type !== FOpT.OK) {
            if (mode === 'r' || res.type === FOpT.NOT_ALLOWED_TYPE) return res
            const { dirname, filename } = Path.getDirAndName(path)

            if (! filename) return fErr({ type: FOpT.ILLEGAL_NAME })

            const dirRes = this.find(dirname, { allowedTypes: [ FileT.DIR ] })
            if (dirRes.type !== FOpT.OK) return dirRes

            const { file: dir } = dirRes
            const inode = this.build({
                ...FsBuilder.normal(''),
            })
            file = inode.file
            dir.entries[filename] = inode.iid
        }
        else {
            file = res.file
        }

        return {
            type: FOpT.OK,
            handle: this.createFileHandle(file, mode),
        }
    }

    openU<FM extends FileMode>(path: string, mode: FM) {
        return this.unwrap(this.open(path, mode), path)
    }
}

export type FileModeWritable = 'w' | 'a' | 'rw' | 'ra'
export type FileMode = 'r' | FileModeWritable

export abstract class FileHandle {
    constructor(protected file: NormalFile) {}

    abstract readonly mode: FileMode

    protected cursor = 0

    get isAtEof() {
        return this.cursor >= this.file.content.length
    }

    get currentChar() {
        return this.file.content[this.cursor]
    }
}

export type FileHandleFromMode<FM extends FileMode> =
    FM extends 'r' ? FileHandleR :
    FM extends 'w' ? FileHandleW :
    FM extends 'a' ? FileHandleA :
    FM extends 'rw' ? FileHandleRW :
    FM extends 'ra' ? FileHandleRA :
    never

export class FileHandleR extends FileHandle implements FRead {
    readonly mode: FileMode = 'r'

    readChar() {
        if (this.isAtEof) return null
        const char = this.currentChar
        this.cursor ++
        return char
    }
    readKey({}: FReadKeyOptions) {
        return this.readChar()
    }
    readUntil(pred: Pred<string>) {
        let start = this.cursor
        while (! (this.isAtEof || pred(this.currentChar))) this.cursor ++
        return this.file.content.slice(start, this.cursor)
    }

    read() {
        return this.readUntil(() => false)
    }
    readLn() {
        return this.readUntil(char => char === '\n')
    }
}

export abstract class FileHandleWritable extends FileHandle implements FWrite {
    abstract readonly mode: FileModeWritable

    write(data: string) {
        if (this.mode.endsWith('a')) this.append(data)
        else this.rewrite(data)
    }
    writeLn(data: string) {
        this.write(data + '\n')
    }

    rewrite(data: string) {
        this.file.content = data
    }
    rewriteLn(data: string) {
        this.rewrite(data + '\n')
    }

    append(data: string) {
        this.file.content += data
    }
    appendLn(data: string) {
        this.append(data + '\n')
    }   
}

export class FileHandleW extends FileHandleWritable implements FWrite {
    readonly mode: FileModeWritable = 'w'
}

export class FileHandleA extends FileHandleWritable implements FWrite {
    readonly mode: FileModeWritable = 'a'
}

export interface FileHandleRW extends Omit<FileHandleR, 'mode'>, Omit<FileHandleW, 'mode'> {}
export class FileHandleRW extends FileHandle implements FReadWrite {
    static {
        mixin(this, FileHandleR)
        mixin(this, FileHandleW)
    }

    readonly mode: FileMode = 'rw'
}

export interface FileHandleRA extends Omit<FileHandleR, 'mode'>, Omit<FileHandleW, 'mode'> {}
export class FileHandleRA extends FileHandle implements FReadWrite {
    static {
        mixin(this, FileHandleR)
        mixin(this, FileHandleA)
    }

    readonly mode: FileMode = 'ra'
}
