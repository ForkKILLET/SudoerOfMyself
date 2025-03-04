import { getSysImage } from '@/data/sys_image'
import { Program } from '@/sys0/program'
import { Awaitable, DistributiveOmit, MakeOptional, Pred, StrictOmit } from '@/utils/types'
import { Context } from './context'
import { mixin, Signal } from '@/utils'

export namespace Path {
    export const hasSlash = (path: string) => path.includes('/')
    export const isAbs = (path: string) => path.startsWith('/')
    export const isRel = (path: string) => path.match(/^\.\.?(\/|$)/)
    export const isAbsOrRel = (path: string) => isAbs(path) || isRel(path)
    export const split = (path: string) => path.split('/').filter(Boolean)
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

export type File =
    | DirFile
    | NormalFile
    | JsExeFile

export interface FileEntry<F extends File = File> {
    path: string
    file: F
}

export interface DirFile {
    type: FileT.DIR
    children: Record<string, File>
    parent: DirFile | null
}

export interface NormalFile {
    type: FileT.NORMAL
    content: string
    parent: DirFile
}

export interface JsExeFile {
    type: FileT.JSEXE
    program: Program
    parent: DirFile
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

export namespace FileBuilder {
    export type Orphan<F extends File> = MakeOptional<F, 'parent'>

    export const dir = (children: Record<string, Orphan<File>> = {}): DirFile => {
        const self: DirFile = {
            type: FileT.DIR,
            children: children as Record<string, File>,
            parent: null,
        }

        for (const name in children) {
            children[name].parent = self
        }
        
        return self
    }

    export const normal = (content: string): Orphan<NormalFile> => ({
        type: FileT.NORMAL,
        content,
    })

    export const jsExe = (program: Program): Orphan<JsExeFile> => ({
        type: FileT.JSEXE,
        program,
    })
}

export const enum FOpT {
    OK,
    ILLEGAL_NAME,
    NOT_FOUND,
    NOT_DIR,
    NOT_ALLOWED_TYPE,
    ALREADY_EXISTS,
}

export const kFOpError: unique symbol = Symbol('FOpError')
export type FOpError = { [kFOpError]: true } & (
    | { type: FOpT.ILLEGAL_NAME }
    | { type: FOpT.NOT_FOUND }
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

export type FFindResult<F extends File = File> = FOpResult<{ file: F }>
export type FMkdirResult = FOpResult<{ dir: DirFile }>
export type FReadResult = FOpResult<{ content: string }>
export type FOpenResult<FM extends FileMode> = FOpResult<{ handle: FileHandleFromMode<FM> }>

export interface FindOptions<FT extends FileT = FileT> {
    allowedTypes?: readonly FT[]
}

export type FOpMethod = 'find' | 'mkdir' | 'read'

export class Fs {
    root = getSysImage()

    constructor(public ctx: Context) {}

    get cwd() {
        return this.ctx.fgProc.cwd
    }

    getFilename(file: File) {
        const { parent } = file
        if (! parent) return ''
        for (const name in parent.children) {
            if (parent.children[name] === file) return name
        }
        return ''
    }

    getPath(file: File) {
        const parts: string[] = []
        let current = file
        let parent = file.parent
        while (parent) {
            for (const name in parent.children) {
                if (parent.children[name] === current) {
                    parts.unshift(name)
                    break
                }
            }
            current = parent
            parent = current.parent
        }
        return '/' + parts.join('/')
    }

    isOfType<FT extends FileT>(file: File, types: readonly FT[]): file is FileFromT<FT> {
        return types.includes(file.type)
    }

    unwrap<T>(res: FOpResult<T>, errHead: string): FOpOk<T> {
        if (! (kFOpError in res)) return res

        switch (res.type) {
        case FOpT.ILLEGAL_NAME:
            throw `${errHead}: Illegal file name`
        case FOpT.NOT_FOUND:
            throw `${errHead}: No such file or directory`
        case FOpT.NOT_DIR:
            throw `${errHead}: Not a directory`
        case FOpT.NOT_ALLOWED_TYPE:
            throw `${errHead}: Not ${res.allowedTypes.map(displayFileT).join(' or ')}`
        case FOpT.ALREADY_EXISTS:
            throw `${errHead}: File already exists`
        }
    }

    find<FT extends FileT = FileT>(
        path: string,
        { allowedTypes }: FindOptions<FT> = {}
    ): FFindResult<FileFromT<FT>> {
        let path1 = path
        if (! Path.isAbsOrRel(path1)) path1 = `./${path1}`
        const parts = Path.split(path1)

        if (parts[0] === '.' || parts[0] === '..') {
            parts.unshift(...Path.split(this.cwd))
        }

        let file: File = this.root
        for (const part of parts) {
            if (file.type !== FileT.DIR) return fErr({ type: FOpT.NOT_DIR })
            if (part === '.') continue
            if (part === '..') {
                file = file.parent ?? this.root
                continue
            }
            if (! (part in file.children)) return fErr({ type: FOpT.NOT_FOUND })
            file = file.children[part]
        }

        if (allowedTypes && ! this.isOfType(file, allowedTypes)) {
            return fErr({ type: FOpT.NOT_ALLOWED_TYPE, allowedTypes })
        }

        return {
            type: FOpT.OK,
            file: file as FileFromT<FT>,
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
        if (parent.children[filename]) return fErr({ type: FOpT.ALREADY_EXISTS })

        const dir = parent.children[filename] = FileBuilder.dir()
        dir.parent = parent

        return {
            type: FOpT.OK,
            dir,
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
            file = dir.children[filename] = {
                ...FileBuilder.normal(''),
                parent: dir,
            }
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
