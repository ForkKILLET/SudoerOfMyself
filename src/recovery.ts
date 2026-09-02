import { serializeGameSave } from '@/sys0/save'
import { deleteIndexedDbFileSystem, IndexedDbFileSystemStore } from '@/sys0/fs/indexed_db'
import { errorMessage } from '@/utils/errors'

interface FailureModeOptions {
  eyebrow: string
  title: string
  description: string
  recoveryActions: boolean
}

const getElement = <E extends HTMLElement>(id: string) => {
  const element = document.getElementById(id)
  if (! element) throw new Error(`Recovery element #${id} not found`)
  return element as E
}

const downloadFileSystemSave = async () => {
  const store = await IndexedDbFileSystemStore.open({ databaseVersion: null })
  try {
    const serialized = serializeGameSave(await store.exportRaw())
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

const showFailureMode = (error: unknown, options: FailureModeOptions) => {
  const terminal = getElement<HTMLElement>('xterm-container')
  const recovery = getElement<HTMLElement>('recovery')
  const eyebrow = getElement<HTMLElement>('recovery-eyebrow')
  const title = getElement<HTMLElement>('recovery-title')
  const description = getElement<HTMLElement>('recovery-description')
  const details = getElement<HTMLElement>('recovery-error')
  const actions = getElement<HTMLElement>('recovery-actions')

  terminal.hidden = true
  recovery.hidden = false
  eyebrow.textContent = options.eyebrow
  title.textContent = options.title
  description.textContent = options.description
  details.textContent = error instanceof Error && error.stack
    ? error.stack
    : errorMessage(error)
  actions.hidden = ! options.recoveryActions
}

export const showStartupBlockedMode = (
  error: unknown,
  title: string,
  description: string,
) => {
  console.error('Game startup blocked', error)
  showFailureMode(error, {
    eyebrow: 'STARTUP BLOCKED',
    title,
    description,
    recoveryActions: false,
  })
}

export const showRecoveryMode = (error: unknown) => {
  console.error('Game startup failed', error)

  const status = getElement<HTMLElement>('recovery-status')
  const exportButton = getElement<HTMLButtonElement>('recovery-export')
  const resetButton = getElement<HTMLButtonElement>('recovery-reset')

  showFailureMode(error, {
    eyebrow: 'RECOVERY MODE',
    title: 'HumanOS could not start',
    description: 'The local save may be damaged. Export it for inspection before resetting, '
      + 'or reload the page to try again without changing it.',
    recoveryActions: true,
  })

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
