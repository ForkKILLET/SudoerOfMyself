import { FileT, Fs } from '@/sys0/fs'
import { Path } from '@/sys0/fs/path'
import { matchesShellPattern, ShellPatternPart } from '../shell_pattern'

interface PathPattern {
  absolute: boolean
  trailingSlash: boolean
  segments: ShellPatternPart[][]
}

const pushPart = (parts: ShellPatternPart[], value: string, literal: boolean) => {
  if (! value) return
  const previous = parts.at(- 1)
  if (previous?.literal === literal) previous.value += value
  else parts.push({ value, literal })
}

const splitPathPattern = (parts: readonly ShellPatternPart[]): PathPattern => {
  const content = parts.map(part => part.value).join('')
  const segments: ShellPatternPart[][] = [[]]

  parts.forEach((part) => {
    let begin = 0
    for (let index = 0; index < part.value.length; index ++) {
      if (part.value[index] !== '/') continue
      pushPart(segments[segments.length - 1], part.value.slice(begin, index), part.literal)
      if (segments.at(- 1)?.length) segments.push([])
      begin = index + 1
    }
    pushPart(segments[segments.length - 1], part.value.slice(begin), part.literal)
  })

  return {
    absolute: content.startsWith('/'),
    trailingSlash: content.length > 1 && content.endsWith('/'),
    segments: segments.filter(segment => segment.length),
  }
}

const hasActivePattern = (parts: readonly ShellPatternPart[]) => parts.some(part => (
  ! part.literal && /[*?[]/u.test(part.value)
))

const renderPattern = (parts: readonly ShellPatternPart[]) => parts.map(part => part.value).join('')

interface PathCandidate {
  lookupPath: string
  displaySegments: string[]
}

export const expandPathname = (
  fs: Fs,
  cwd: string,
  parts: readonly ShellPatternPart[],
) => {
  const pattern = splitPathPattern(parts)
  let candidates: PathCandidate[] = [{
    lookupPath: pattern.absolute ? '/' : Path.resolve('.', cwd),
    displaySegments: [],
  }]

  pattern.segments.forEach((segment) => {
    const rendered = renderPattern(segment)
    const isPattern = hasActivePattern(segment)
    const next: PathCandidate[] = []

    candidates.forEach((candidate) => {
      if (! isPattern) {
        const lookupPath = Path.resolve(rendered, candidate.lookupPath)
        if (fs.findInode(lookupPath, { cwd: '/' }).isOk) {
          next.push({
            lookupPath,
            displaySegments: [...candidate.displaySegments, rendered],
          })
        }
        return
      }

      const directory = fs.findInode(candidate.lookupPath, {
        allowedTypes: [FileT.DIR],
        cwd: '/',
      })
      if (directory.isErr) return
      const includesHidden = rendered.startsWith('.')
      fs.getChildren(directory.val.inode.file)
        .filter(child => child.inode !== undefined)
        .map(child => child.name)
        .filter(name => (includesHidden || ! name.startsWith('.')) && matchesShellPattern(name, segment))
        .sort()
        .forEach((name) => {
          next.push({
            lookupPath: Path.join(candidate.lookupPath, name),
            displaySegments: [...candidate.displaySegments, name],
          })
        })
    })

    candidates = next
  })

  return candidates
    .filter(candidate => ! pattern.trailingSlash || fs.findInode(candidate.lookupPath, {
      allowedTypes: [FileT.DIR],
      cwd: '/',
    }).isOk)
    .map((candidate) => {
      const body = candidate.displaySegments.join('/')
      const path = pattern.absolute ? `/${body}` : body
      return pattern.trailingSlash ? `${path}/` : path
    })
    .sort()
}
