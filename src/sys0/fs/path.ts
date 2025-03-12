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
    export const trimSlash = (segment: string) => segment.replace(/\/+$/, '')
    export const join = (...segments: string[]) => segments.map(trimSlash).join('/')
    export const getDirAndName = (path: string, doKeepSlashAtEnd = false) => {
        if (! isAbs(path)) path = `./${path}`
        const parts = split(path, doKeepSlashAtEnd)
        const filename = parts.pop()!
        const dirname = parts.join('/') + '/'
        return { dirname, filename }
    }
    export const isLegalFilename = (name: string) => !! name && ! name.includes('/')

    export const normalize = (path: string) => {
        const parts = split(path || '.', true)
        if (! [ '', '.', '..' ].includes(parts.at(0))) parts.unshift('.')
        const normalizedParts: string[] = []
        normalizedParts.push(parts[0])
        for (let i = 1; i < parts.length; i ++) {
            const part = parts[i]
            if (part === '..') normalizedParts.pop()
            else if (part !== '.') normalizedParts.push(part)
        }
        return normalizedParts.join('/')
    }
}

Object.assign(window, {Path})
