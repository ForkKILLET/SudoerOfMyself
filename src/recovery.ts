import { serializeGameSave } from '@/sys0/save'
import { deleteIndexedDbFileSystem, IndexedDbFileSystemStore } from '@/sys0/fs/indexed_db'
import { Stdio } from '@/sys0/stdio'
import { Term } from '@/sys0/term'
import { errorMessage } from '@/utils/errors'
import { runRecoveryConsole } from '@/recovery_console'
import type { StorageNamespace } from '@/storage_namespace'
import { setupTerminalSize } from '@/terminal_size'

interface FailureModeOptions {
  eyebrow: string
  title: string
  description: string
  recoveryActions: boolean
}

const downloadFileSystemSave = async (storage: StorageNamespace) => {
  const store = await IndexedDbFileSystemStore.open({
    databaseName: storage.databaseName,
    databaseVersion: null,
  })
  try {
    const serialized = serializeGameSave(await store.exportRaw())
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const url = URL.createObjectURL(new Blob([serialized], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    const namespace = storage.name === 'debug' ? '-debug' : ''
    anchor.download = `sudoer-of-myself${namespace}-save-${timestamp}.json`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  finally {
    store.close()
  }
}

const reloadWithoutRecoveryMode = () => {
  const url = new URL(location.href)
  url.searchParams.delete('recovery')
  location.assign(url)
}

const showFailureMode = (
  error: unknown | undefined,
  options: FailureModeOptions,
  storage: StorageNamespace,
) => {
  const container = document.getElementById('xterm-container')
  if (! container) throw new Error('Terminal container not found')
  container.replaceChildren()

  const term = new Term({
    useWebglAddon: false,
    theme: {
      background: '#090b08',
      foreground: '#d8dec5',
      cursor: '#b6c86b',
      selectionBackground: '#48502e',
    },
  })
  term.open(container)
  const app = document.getElementById('app')
  if (app && container.parentElement) {
    setupTerminalSize({ app, shell: container.parentElement, container, term })
  }
  term.focus()

  const io = Stdio.fromTerm(term)
  void runRecoveryConsole(io, { error, storageName: storage.name, ...options }, {
    exportSave: () => downloadFileSystemSave(storage),
    resetSave: () => deleteIndexedDbFileSystem({ databaseName: storage.databaseName }),
    reload: reloadWithoutRecoveryMode,
  }).catch((consoleError: unknown) => {
    console.error('Recovery console failed', consoleError)
    io.writeLn(`Recovery console failed: ${errorMessage(consoleError)}`)
  })
}

export const showStartupBlockedMode = (
  error: unknown,
  title: string,
  description: string,
  storage: StorageNamespace,
) => {
  console.error('Game startup blocked', error)
  showFailureMode(error, {
    eyebrow: 'STARTUP BLOCKED',
    title,
    description,
    recoveryActions: false,
  }, storage)
}

export const showRecoveryMode = (error: unknown, storage: StorageNamespace) => {
  console.error('Game startup failed', error)
  showFailureMode(error, {
    eyebrow: 'RECOVERY MODE',
    title: 'HumanOS could not start',
    description: 'The local save may be damaged. Export it for inspection before resetting, '
      + 'or reload the page to try again without changing it.',
    recoveryActions: true,
  }, storage)
}

export const showRequestedRecoveryMode = (storage: StorageNamespace) => {
  showFailureMode(undefined, {
    eyebrow: 'RECOVERY MODE',
    title: 'HumanOS recovery tools',
    description: 'Normal startup was skipped because recovery mode was requested.',
    recoveryActions: true,
  }, storage)
}
