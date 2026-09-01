import { serializeFileSystemSave } from '@/sys0/fs/save'
import { deleteIndexedDbFileSystem, IndexedDbFileSystemStore } from '@/sys0/fs/indexed_db'
import { errorMessage } from '@/utils/errors'

const getElement = <E extends HTMLElement>(id: string) => {
  const element = document.getElementById(id)
  if (! element) throw new Error(`Recovery element #${id} not found`)
  return element as E
}

const downloadFileSystemSave = async () => {
  const store = await IndexedDbFileSystemStore.open({ databaseVersion: null })
  try {
    const [snapshot, previousSnapshot] = await Promise.all([
      store.load(),
      store.loadPrevious(),
    ])
    const serialized = serializeFileSystemSave(snapshot, new Date(), previousSnapshot)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const url = URL.createObjectURL(new Blob([serialized], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `sudoer-of-myself-save-${timestamp}.json`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  finally {
    store.close()
  }
}

export const showRecoveryMode = (error: unknown) => {
  console.error('Game startup failed', error)

  const terminal = getElement<HTMLElement>('xterm-container')
  const recovery = getElement<HTMLElement>('recovery')
  const details = getElement<HTMLElement>('recovery-error')
  const status = getElement<HTMLElement>('recovery-status')
  const exportButton = getElement<HTMLButtonElement>('recovery-export')
  const resetButton = getElement<HTMLButtonElement>('recovery-reset')

  terminal.hidden = true
  recovery.hidden = false
  details.textContent = error instanceof Error && error.stack
    ? error.stack
    : errorMessage(error)

  exportButton.onclick = async () => {
    exportButton.disabled = true
    try {
      await downloadFileSystemSave()
      status.textContent = 'Save exported.'
    }
    catch (exportError) {
      status.textContent = `Export failed: ${errorMessage(exportError)}`
    }
    finally {
      exportButton.disabled = false
    }
  }

  resetButton.onclick = async () => {
    if (! window.confirm('Delete the local save and start over? Export it first if you may need it.')) return
    resetButton.disabled = true
    try {
      await deleteIndexedDbFileSystem()
      location.reload()
    }
    catch (resetError) {
      status.textContent = `Reset failed: ${errorMessage(resetError)}`
      resetButton.disabled = false
    }
  }
}
