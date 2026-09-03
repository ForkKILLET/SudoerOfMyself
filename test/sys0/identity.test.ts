import { describe, expect, it } from 'vitest'
import {
  AccountService,
  canSignal,
  cloneProcessCredentials,
  createExecCredentials,
  HUMAN_GROUP_ID,
  HUMAN_USER_ID,
} from '@/sys0/identity'

describe('accounts and process credentials', () => {
  it('resolves the default users and their groups', () => {
    const accounts = new AccountService()

    expect(accounts.getUserByName('human')?.uid).toBe(HUMAN_USER_ID)
    expect(accounts.getGroupByName('human')?.gid).toBe(HUMAN_GROUP_ID)
    expect(accounts.getGroupsForUser(HUMAN_USER_ID)).toContain(HUMAN_GROUP_ID)
  })

  it('clones supplementary groups without sharing mutable state', () => {
    const credentials = new AccountService().createCredentials(HUMAN_USER_ID)
    const cloned = cloneProcessCredentials(credentials)

    expect(cloned).toEqual(credentials)
    expect(cloned.supplementaryGids).not.toBe(credentials.supplementaryGids)
  })

  it('applies set-user-ID and set-group-ID during exec', () => {
    const credentials = new AccountService().createCredentials(HUMAN_USER_ID)

    const elevated = createExecCredentials(credentials, {
      uid: 0,
      gid: 0,
      setUid: true,
      setGid: true,
    })

    expect(elevated).toMatchObject({
      realUid: HUMAN_USER_ID,
      effectiveUid: 0,
      savedUid: 0,
      realGid: HUMAN_GROUP_ID,
      effectiveGid: 0,
      savedGid: 0,
    })
  })

  it('allows signalling matching real identities and lets root signal any process', () => {
    const accounts = new AccountService()
    const human = accounts.createCredentials(HUMAN_USER_ID)
    const root = accounts.createCredentials(0)
    const elevatedHuman = createExecCredentials(human, {
      uid: 0,
      gid: 0,
      setUid: true,
      setGid: false,
    })

    expect(canSignal(human, elevatedHuman)).toBe(true)
    expect(canSignal(human, root)).toBe(false)
    expect(canSignal(root, human)).toBe(true)
  })

  it('rejects accounts whose primary group does not exist', () => {
    expect(() => new AccountService([{
      name: 'orphan',
      uid: 12,
      primaryGid: 99,
      home: '/home/orphan',
      shell: '/bin/hsh',
    }], [])).toThrow('Primary group 99')
  })
})
