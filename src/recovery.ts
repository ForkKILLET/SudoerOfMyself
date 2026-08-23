import { Result } from 'fk-result'
import { serializeFileSystemSave, resetFileSystemSave } from '@/sys0/fs/save'
import { errorMessage } from '@/utils/errors'

const getElement = <E extends HTMLElement>(id: string) => {
  const element = document.getElementById(id)
  if (! element) throw new Error(`Recovery element #${id} not found`)
  return element as E
}

const downloadFileSystemSave = () => {
  const serialized = serializeFileSystemSave(localStorage)
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

  exportButton.onclick = () => {
    Result.wrap<void, unknown>(downloadFileSystemSave).match(
      () => { status.textContent = 'Save exported.' },
      (exportError) => { status.textContent = `Export failed: ${errorMessage(exportError)}` },
    )
  }

  resetButton.onclick = () => {
    if (! window.confirm('Delete the local save and start over? Export it first if you may need it.')) return
    Result.wrap<void, unknown>(() => resetFileSystemSave(localStorage)).match(
      () => location.reload(),
      (resetError) => { status.textContent = `Reset failed: ${errorMessage(resetError)}` },
    )
  }
}
