const RELOAD_MARKER = 'sudoer:coi-reload'

const reloadUnderServiceWorker = () => {
  if (sessionStorage.getItem(RELOAD_MARKER)) return false
  sessionStorage.setItem(RELOAD_MARKER, '1')
  location.reload()
  return true
}

export const prepareCrossOriginIsolation = async (): Promise<boolean> => {
  if (crossOriginIsolated) {
    sessionStorage.removeItem(RELOAD_MARKER)
    return true
  }
  if (! isSecureContext || ! ('serviceWorker' in navigator)) return true

  try {
    await navigator.serviceWorker.register('./coi-serviceworker.js')
    if (navigator.serviceWorker.controller) {
      return ! reloadUnderServiceWorker()
    }

    navigator.serviceWorker.addEventListener('controllerchange', reloadUnderServiceWorker, { once: true })
    return false
  }
  catch (error) {
    console.warn('Could not enable cross-origin isolation', error)
    return true
  }
}
