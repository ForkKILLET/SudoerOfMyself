export namespace Path {
    export const hasSlash = (path: string) => path.includes('/')
    export const isAbs = (path: string) => path.startsWith('/')
    export const isRel = (path: string) => path.match(/^\.\.?(\/|$)/)
    export const isAbsOrRel = (path: string) => isAbs(path) || isRel(path)
    export const split = (path: string, doKeepSlashAtEnd = false) => (
        path.split('/').filter((part, i, parts) => (
            part ||
            ! i ||
            i === parts.length - 1 && doKeepSlashAtEnd
        ))
    )
    export const joinAbs = (parts: string[]) => '/' + parts.slice(1).join('/')
    export const getDirAndName = (path: string, doKeepSlashAtEnd = false) => {
        if (! isAbs(path)) path = `./${path}`
        const parts = split(path, doKeepSlashAtEnd)
        const filename = parts.pop()!
        const dirname = parts.join('/') + '/'
        return { dirname, filename }
    }
    export const isLegalFilename = (name: string) => !! name && ! name.includes('/')
}
