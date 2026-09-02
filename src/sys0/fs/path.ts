export namespace Path {
  export const hasSlash = (path: string) => path.includes('/')
  export const isAbs = (path: string) => path.startsWith('/')
  export const isRel = (path: string) => /^\.\.?(\/|$)/.test(path)
  export const isAbsOrRel = (path: string) => isAbs(path) || isRel(path)
  export const hasTrailingSlash = (path: string) => path.length > 1 && path.endsWith('/')

  export const normalize = (path: string) => {
    const absolute = isAbs(path)
    const parts: string[] = []

    for (const part of path.split('/')) {
      if (! part || part === '.') continue
      if (part === '..') {
        if (parts.length && parts.at(- 1) !== '..') parts.pop()
        else if (! absolute) parts.push(part)
        continue
      }
      parts.push(part)
    }

    if (absolute) return `/${parts.join('/')}`
    return parts.join('/') || '.'
  }

  export const resolve = (path: string, cwd = '/') => {
    if (isAbs(path)) return normalize(path)
    const base = isAbs(cwd) ? cwd : `/${cwd}`
    return normalize(`${base}/${path || '.'}`)
  }

  export const split = (path: string) => normalize(path).split('/').filter(Boolean)

  export const join = (...segments: string[]) => {
    const joined = segments.filter(Boolean).join('/')
    return normalize(joined)
  }

  export const getDirAndName = (path: string, keepSlashAtEnd = false) => {
    const trailingSlash = hasTrailingSlash(path)
    const normalized = normalize(path)

    if (keepSlashAtEnd && trailingSlash) {
      return {
        dirname: normalized === '/' ? '/' : `${normalized}/`,
        filename: '',
      }
    }
    if (normalized === '/') return { dirname: '/', filename: '' }

    const separator = normalized.lastIndexOf('/')
    if (separator === - 1) return { dirname: './', filename: normalized }
    return {
      dirname: normalized.slice(0, separator + 1) || '/',
      filename: normalized.slice(separator + 1),
    }
  }

  export const isLegalFilename = (name: string) => (
    !! name && name !== '.' && name !== '..' && ! name.includes('/')
  )
}
