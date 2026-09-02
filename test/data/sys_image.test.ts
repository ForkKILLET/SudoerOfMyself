import { describe, expect, it } from 'vitest'
import { getBinImage, getRootImage } from '@/data/sys_image'
import { Fs } from '@/sys0/fs'
import { MemoryFsPersistence } from '@/sys0/fs/persistence'

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
    expect(fs.findInodeU('/bin/one').inode.executable?.programId).toBe('one')
    expect(fs.findInodeU('/bin/two').inode.executable?.programId).toBe('two')
    expect(fs.inodes.size).toBe(34)
  })
})
