import { describe, expect, it } from 'vitest'
import { getBinImage, getRootImage } from '@/data/sys_image'
import { Fs } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'
import { HUMAN_GROUP_ID, HUMAN_USER_ID, ROOT_GROUP_ID, ROOT_USER_ID } from '@/sys0/identity'

describe('system file-system images', () => {
  it('keeps native commands outside the persistent root image', () => {
    const fs = new Fs(getRootImage(), {
      persistence: new MemoryFsPersistence(),
      mounts: [{
        path: '/bin',
        image: getBinImage(['one', 'two']),
        readOnly: true,
      }],
    })

    expect(fs.find('/home/hello.txt').isOk).toBe(true)
    expect(fs.openU('/home/.profile', 'r').handle.read()).toContain('HISTFILE=$HOME/.hsh_history')
    expect(fs.openU('/bin/one', 'r').handle.read()).toBe('#!sys\none\n')
    expect(fs.openU('/bin/two', 'r').handle.read()).toBe('#!sys\ntwo\n')
    expect(fs.statU('/')).toMatchObject({
      uid: ROOT_USER_ID,
      gid: ROOT_GROUP_ID,
      mode: 0o755,
    })
    expect(fs.statU('/home')).toMatchObject({
      uid: HUMAN_USER_ID,
      gid: HUMAN_GROUP_ID,
      mode: 0o700,
    })
    expect(fs.statU('/home/hello.txt')).toMatchObject({
      uid: HUMAN_USER_ID,
      gid: HUMAN_GROUP_ID,
      mode: 0o644,
    })
    expect(fs.statU('/bin/one')).toMatchObject({
      uid: ROOT_USER_ID,
      gid: ROOT_GROUP_ID,
      mode: 0o751,
    })
    expect(fs.inodes.size).toBe(35)
  })
})
