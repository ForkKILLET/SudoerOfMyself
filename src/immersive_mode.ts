interface KeyboardLockApi {
  lock(keyCodes?: string[]): Promise<void>
  unlock(): void
}

interface NavigatorWithKeyboardLock extends Navigator {
  readonly keyboard?: KeyboardLockApi
}

interface FullscreenOptionsWithKeyboardLock extends FullscreenOptions {
  keyboardLock?: 'browser' | 'none'
}

export interface ImmersiveModeOptions {
  container: HTMLElement
  button: HTMLButtonElement
  focusApplication: () => void
}

const keyboardLockApi = () => {
  const keyboard = (navigator as NavigatorWithKeyboardLock).keyboard
  return keyboard
    && typeof keyboard.lock === 'function'
    && typeof keyboard.unlock === 'function'
    ? keyboard
    : undefined
}

const enterImmersiveMode = async (container: HTMLElement) => {
  const keyboard = keyboardLockApi()
  if (keyboard) {
    await container.requestFullscreen()
    try {
      await keyboard.lock(['KeyW'])
      return true
    }
    catch (error) {
      console.warn('Could not lock browser keyboard shortcuts', error)
      return false
    }
  }

  try {
    await container.requestFullscreen({
      keyboardLock: 'browser',
    } as FullscreenOptionsWithKeyboardLock)
    return true
  }
  catch (error) {
    if (! (error instanceof DOMException) || error.name !== 'NotSupportedError') throw error
    await container.requestFullscreen()
    return false
  }
}

export const setupImmersiveMode = ({
  container,
  button,
  focusApplication,
}: ImmersiveModeOptions) => {
  if (! document.fullscreenEnabled || typeof container.requestFullscreen !== 'function') return

  let pending = false
  let keyboardLockRequested = false

  const active = () => document.fullscreenElement === container
  const render = () => {
    const isActive = active()
    button.dataset.active = String(isActive)
    button.setAttribute('aria-label', isActive ? 'Exit fullscreen' : 'Enter fullscreen')
    button.setAttribute('aria-pressed', String(isActive))
    button.disabled = pending
    button.title = isActive
      ? keyboardLockRequested
        ? 'Immersive mode is active; Ctrl+W capture was requested.'
        : 'Immersive mode is active. Use Ctrl+F for nano search.'
      : 'Enter fullscreen and request capture of browser keyboard shortcuts.'
  }

  const toggle = async () => {
    if (pending) return
    pending = true
    render()
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        keyboardLockApi()?.unlock()
        keyboardLockRequested = false
      }
      else keyboardLockRequested = await enterImmersiveMode(container)
    }
    catch (error) {
      keyboardLockRequested = false
      console.warn('Could not change immersive mode', error)
    }
    finally {
      pending = false
      render()
      focusApplication()
    }
  }

  document.addEventListener('fullscreenchange', () => {
    if (! active()) {
      keyboardLockApi()?.unlock()
      keyboardLockRequested = false
    }
    render()
  })
  button.addEventListener('click', () => void toggle())
  button.hidden = false
  render()
}
