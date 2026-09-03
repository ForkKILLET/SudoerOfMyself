export type UserId = number
export type GroupId = number

export const ROOT_USER_ID: UserId = 0
export const ROOT_GROUP_ID: GroupId = 0
export const HUMAN_USER_ID: UserId = 1000
export const HUMAN_GROUP_ID: GroupId = 1000

export interface UserAccount {
  name: string
  uid: UserId
  primaryGid: GroupId
  home: string
  shell: string
}

export interface GroupAccount {
  name: string
  gid: GroupId
  members: readonly UserId[]
}

export interface ProcessCredentials {
  realUid: UserId
  effectiveUid: UserId
  savedUid: UserId
  realGid: GroupId
  effectiveGid: GroupId
  savedGid: GroupId
  supplementaryGids: ReadonlySet<GroupId>
}

export const createProcessCredentials = (
  uid: UserId,
  gid: GroupId,
  supplementaryGids: Iterable<GroupId> = [],
): ProcessCredentials => ({
  realUid: uid,
  effectiveUid: uid,
  savedUid: uid,
  realGid: gid,
  effectiveGid: gid,
  savedGid: gid,
  supplementaryGids: new Set(supplementaryGids),
})

export const cloneProcessCredentials = (
  credentials: ProcessCredentials,
): ProcessCredentials => ({
  ...credentials,
  supplementaryGids: new Set(credentials.supplementaryGids),
})

export const createExecCredentials = (
  credentials: ProcessCredentials,
  { uid, gid, setUid, setGid }: {
    uid: UserId
    gid: GroupId
    setUid: boolean
    setGid: boolean
  },
): ProcessCredentials => {
  const cloned = cloneProcessCredentials(credentials)
  if (setUid) {
    cloned.effectiveUid = uid
    cloned.savedUid = uid
  }
  if (setGid) {
    cloned.effectiveGid = gid
    cloned.savedGid = gid
  }
  return cloned
}

export const canSignal = (
  sender: ProcessCredentials,
  target: ProcessCredentials,
) => sender.effectiveUid === ROOT_USER_ID || [sender.realUid, sender.effectiveUid].some(uid => (
  uid === target.realUid || uid === target.savedUid
))

export const DEFAULT_USERS: readonly UserAccount[] = [
  {
    name: 'root',
    uid: ROOT_USER_ID,
    primaryGid: ROOT_GROUP_ID,
    home: '/root',
    shell: '/bin/hsh',
  },
  {
    name: 'human',
    uid: HUMAN_USER_ID,
    primaryGid: HUMAN_GROUP_ID,
    home: '/home',
    shell: '/bin/hsh',
  },
]

export const DEFAULT_GROUPS: readonly GroupAccount[] = [
  { name: 'root', gid: ROOT_GROUP_ID, members: [ROOT_USER_ID] },
  { name: 'human', gid: HUMAN_GROUP_ID, members: [HUMAN_USER_ID] },
]

export class AccountService {
  private readonly usersById = new Map<UserId, UserAccount>()
  private readonly usersByName = new Map<string, UserAccount>()
  private readonly groupsById = new Map<GroupId, GroupAccount>()
  private readonly groupsByName = new Map<string, GroupAccount>()

  constructor(
    users: readonly UserAccount[] = DEFAULT_USERS,
    groups: readonly GroupAccount[] = DEFAULT_GROUPS,
  ) {
    users.forEach((user) => {
      if (this.usersById.has(user.uid) || this.usersByName.has(user.name)) {
        throw new Error(`Duplicate user account: ${user.name}`)
      }
      this.usersById.set(user.uid, user)
      this.usersByName.set(user.name, user)
    })
    groups.forEach((group) => {
      if (this.groupsById.has(group.gid) || this.groupsByName.has(group.name)) {
        throw new Error(`Duplicate group account: ${group.name}`)
      }
      this.groupsById.set(group.gid, group)
      this.groupsByName.set(group.name, group)
    })
    users.forEach((user) => {
      if (! this.groupsById.has(user.primaryGid)) {
        throw new Error(`Primary group ${user.primaryGid} for user ${user.name} does not exist`)
      }
    })
  }

  getUserById(uid: UserId) {
    return this.usersById.get(uid)
  }

  getUserByName(name: string) {
    return this.usersByName.get(name)
  }

  getGroupById(gid: GroupId) {
    return this.groupsById.get(gid)
  }

  getGroupByName(name: string) {
    return this.groupsByName.get(name)
  }

  getGroupsForUser(uid: UserId) {
    const groups = new Set<GroupId>()
    const user = this.getUserById(uid)
    if (user) groups.add(user.primaryGid)
    this.groupsById.forEach((group) => {
      if (group.members.includes(uid)) groups.add(group.gid)
    })
    return groups
  }

  createCredentials(uid: UserId) {
    const user = this.getUserById(uid)
    if (! user) throw new Error(`Unknown user ID: ${uid}`)
    return createProcessCredentials(user.uid, user.primaryGid, this.getGroupsForUser(uid))
  }
}
