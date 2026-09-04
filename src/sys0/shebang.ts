import { Err, Ok, type Result } from 'fk-result'
import { Path } from './fs/path'

export interface Shebang {
  interpreterPath: string
  argument?: string
}

export interface InvalidShebangError {
  type: 'invalid-shebang'
}

export const parseShebang = (
  content: string,
): Result<Shebang | undefined, InvalidShebangError> => {
  if (! content.startsWith('#!')) return Ok(undefined)
  const firstLine = content.slice(2).split('\n', 1)[0].replace(/\r$/u, '')
  const match = /^\s*(\S+)(?:[ \t]+(.+?))?\s*$/u.exec(firstLine)
  if (! match || ! Path.isAbs(match[1])) return Err({ type: 'invalid-shebang' })
  return Ok({
    interpreterPath: Path.normalize(match[1]),
    ...(match[2] ? { argument: match[2] } : {}),
  })
}
