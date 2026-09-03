import { Err, Ok, type Result } from 'fk-result'
import { FileT } from '.'
import { FILE_PERMISSION_MASK, PermissionBits, type UnixMode } from './permissions'

export interface InvalidModeError {
  type: 'invalid-mode'
  value: string
}

const CLASS_SHIFT = { u: 6, g: 3, o: 0 } as const
type ModeClass = keyof typeof CLASS_SHIFT

const classMask = (classes: readonly ModeClass[]) => classes.reduce(
  (mask, modeClass) => mask | (0o7 << CLASS_SHIFT[modeClass]),
  0,
)

const specialMask = (classes: readonly ModeClass[]) => classes.reduce((mask, modeClass) => {
  if (modeClass === 'u') return mask | PermissionBits.SET_UID
  if (modeClass === 'g') return mask | PermissionBits.SET_GID
  return mask | PermissionBits.STICKY
}, 0)

const permissionBits = (
  permissions: string,
  classes: readonly ModeClass[],
  currentMode: UnixMode,
  isDirectory: boolean,
) => {
  let bits = 0
  for (const modeClass of classes) {
    const shift = CLASS_SHIFT[modeClass]
    if (permissions.includes('r')) bits |= 0o4 << shift
    if (permissions.includes('w')) bits |= 0o2 << shift
    if (permissions.includes('x')) bits |= 0o1 << shift
    if (permissions.includes('X') && (isDirectory || (currentMode & 0o111) !== 0)) {
      bits |= 0o1 << shift
    }
    for (const sourceClass of ['u', 'g', 'o'] as const) {
      if (! permissions.includes(sourceClass)) continue
      bits |= ((currentMode >> CLASS_SHIFT[sourceClass]) & 0o7) << shift
    }
    if (permissions.includes('s')) {
      if (modeClass === 'u') bits |= PermissionBits.SET_UID
      if (modeClass === 'g') bits |= PermissionBits.SET_GID
    }
    if (permissions.includes('t') && modeClass === 'o') bits |= PermissionBits.STICKY
  }
  return bits
}

export const parseFileMode = (
  value: string,
  currentMode: UnixMode,
  { isDirectory = false, umask = 0 }: { isDirectory?: boolean, umask?: UnixMode } = {},
): Result<UnixMode, InvalidModeError> => {
  if (/^[0-7]{1,4}$/u.test(value)) return Ok(Number.parseInt(value, 8))

  let mode = currentMode & FILE_PERMISSION_MASK
  for (const clause of value.split(',')) {
    const match = /^([ugoa]*)([+=-])([rwxXstugo]*)$/u.exec(clause)
    if (! match) return Err({ type: 'invalid-mode', value })
    const [, who, operation, permissions] = match
    const explicitWho = who.length > 0
    const classes = [...new Set(
      (who || 'a').replaceAll('a', 'ugo').split('') as ModeClass[],
    )]
    const affected = classMask(classes)
    const allowed = explicitWho ? affected : affected & ~ umask
    const special = specialMask(classes)
    const additions = permissionBits(permissions, classes, mode, isDirectory)
      & (allowed | special)

    if (operation === '+') mode |= additions
    else if (operation === '-') mode &= ~ additions
    else mode = (mode & ~ (allowed | special)) | additions
  }
  return Ok(mode & FILE_PERMISSION_MASK)
}

const triplet = (mode: UnixMode, shift: number, special: number, specialChar: string) => {
  const bits = (mode >> shift) & 0o7
  const execute = (bits & 0o1) !== 0
  const hasSpecial = (mode & special) !== 0
  return `${bits & 0o4 ? 'r' : '-'}${bits & 0o2 ? 'w' : '-'}${
    hasSpecial ? (execute ? specialChar : specialChar.toUpperCase()) : (execute ? 'x' : '-')
  }`
}

export const formatFileMode = (mode: UnixMode, type: FileT) => (
  (type === FileT.DIR ? 'd' : '-')
  + triplet(mode, 6, PermissionBits.SET_UID, 's')
  + triplet(mode, 3, PermissionBits.SET_GID, 's')
  + triplet(mode, 0, PermissionBits.STICKY, 't')
)

export const formatOctalMode = (mode: UnixMode) => (
  (mode & FILE_PERMISSION_MASK).toString(8).padStart(4, '0')
)
