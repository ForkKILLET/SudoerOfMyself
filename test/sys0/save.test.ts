import { describe, expect, it } from 'vitest'
import {
  createGameSaveArchive,
  serializeGameSave,
} from '@/sys0/save'

describe('save recovery', () => {
  it('wraps all supplied recovery data in a versioned archive', () => {
    const exportedAt = new Date('2026-08-24T00:00:00.000Z')
    const data = {
      metadata: { revision: 3 },
      inodes: [{ iid: 1 }],
      gameClock: { worldTimeMs: 1_000 },
    }
    const archive = createGameSaveArchive(data, exportedAt)

    expect(archive).toEqual({
      format: 'sudoer-of-myself/save',
      version: 3,
      exportedAt: '2026-08-24T00:00:00.000Z',
      data,
    })
    expect(JSON.parse(serializeGameSave(data, exportedAt))).toEqual(archive)
  })

  it('preserves invalid raw IndexedDB data without interpreting it', () => {
    const invalidData = {
      metadata: { broken: true },
      inodes: [{ iid: 'invalid' }],
      gameClock: { broken: true },
    }

    expect(createGameSaveArchive(invalidData).data).toEqual(invalidData)
  })
})
