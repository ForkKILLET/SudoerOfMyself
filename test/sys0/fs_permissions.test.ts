import { describe, expect, it } from 'vitest'
import { createProcessCredentials } from '@/sys0/identity'
import {
  AccessMode,
  applyUmask,
  hasPermission,
} from '@/sys0/fs/permissions'

const target = (mode: number, isDirectory = false) => ({
  uid: 10,
  gid: 20,
  mode,
  isDirectory,
})

describe('file permissions', () => {
  it('selects owner, group, supplementary-group, and other bits', () => {
    const owner = createProcessCredentials(10, 30)
    const group = createProcessCredentials(11, 20)
    const supplementary = createProcessCredentials(12, 30, [20])
    const other = createProcessCredentials(13, 30)
    const permissions = target(0o640)

    expect(hasPermission(permissions, owner, AccessMode.READ | AccessMode.WRITE)).toBe(true)
    expect(hasPermission(permissions, group, AccessMode.READ)).toBe(true)
    expect(hasPermission(permissions, supplementary, AccessMode.READ)).toBe(true)
    expect(hasPermission(permissions, other, AccessMode.READ)).toBe(false)
  })

  it('gives root broad access but still requires an execute bit on regular files', () => {
    const root = createProcessCredentials(0, 0)

    expect(hasPermission(target(0o000), root, AccessMode.READ | AccessMode.WRITE)).toBe(true)
    expect(hasPermission(target(0o000), root, AccessMode.EXECUTE)).toBe(false)
    expect(hasPermission(target(0o001), root, AccessMode.EXECUTE)).toBe(true)
    expect(hasPermission(target(0o000, true), root, AccessMode.EXECUTE)).toBe(true)
  })

  it('applies umask without retaining bits outside the supported mode mask', () => {
    expect(applyUmask(0o666, 0o022)).toBe(0o644)
    expect(applyUmask(0o777, 0o027)).toBe(0o750)
    expect(applyUmask(0xFFFF, 0)).toBe(0o7777)
  })
})
