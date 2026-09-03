import { ROOT_USER_ID, type GroupId, type ProcessCredentials, type UserId } from '../identity'

export type UnixMode = number

export const enum PermissionBits {
  OTHER_EXECUTE = 0o001,
  OTHER_WRITE = 0o002,
  OTHER_READ = 0o004,
  GROUP_EXECUTE = 0o010,
  GROUP_WRITE = 0o020,
  GROUP_READ = 0o040,
  OWNER_EXECUTE = 0o100,
  OWNER_WRITE = 0o200,
  OWNER_READ = 0o400,
  STICKY = 0o1000,
  SET_GID = 0o2000,
  SET_UID = 0o4000,
}

export const FILE_PERMISSION_MASK = 0o7777
export const ACCESS_PERMISSION_MASK = 0o7
export const DEFAULT_FILE_MODE: UnixMode = 0o666
export const DEFAULT_DIRECTORY_MODE: UnixMode = 0o777
export const DEFAULT_UMASK: UnixMode = 0o022

export const enum AccessMode {
  EXECUTE = 0o1,
  WRITE = 0o2,
  READ = 0o4,
}

export interface PermissionTarget {
  uid: UserId
  gid: GroupId
  mode: UnixMode
  isDirectory: boolean
}

export const normalizeMode = (mode: number): UnixMode => mode & FILE_PERMISSION_MASK

export const applyUmask = (mode: UnixMode, umask: UnixMode): UnixMode => (
  normalizeMode(mode) & ~ normalizeMode(umask)
)

const effectiveClassBits = (
  target: PermissionTarget,
  credentials: ProcessCredentials,
) => {
  if (credentials.effectiveUid === target.uid) return (target.mode >> 6) & ACCESS_PERMISSION_MASK
  if (
    credentials.effectiveGid === target.gid
    || credentials.supplementaryGids.has(target.gid)
  ) return (target.mode >> 3) & ACCESS_PERMISSION_MASK
  return target.mode & ACCESS_PERMISSION_MASK
}

export const hasPermission = (
  target: PermissionTarget,
  credentials: ProcessCredentials,
  access: AccessMode,
) => {
  if (credentials.effectiveUid === ROOT_USER_ID) {
    if ((access & AccessMode.EXECUTE) === 0 || target.isDirectory) return true
    return (target.mode & 0o111) !== 0
  }
  return (effectiveClassBits(target, credentials) & access) === access
}
