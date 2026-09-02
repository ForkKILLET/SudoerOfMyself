export interface GameSaveArchive {
  format: 'sudoer-of-myself/save'
  version: 3
  exportedAt: string
  data: unknown
}

export const createGameSaveArchive = (
  data: unknown,
  exportedAt = new Date(),
): GameSaveArchive => ({
  format: 'sudoer-of-myself/save',
  version: 3,
  exportedAt: exportedAt.toISOString(),
  data,
})

export const serializeGameSave = (
  data: unknown,
  exportedAt = new Date(),
) => (
  JSON.stringify(createGameSaveArchive(data, exportedAt), null, 2)
)
