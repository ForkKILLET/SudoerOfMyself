import type { Term } from '@/sys0/term'
import {
  defaultTerminalSizePreference,
  dragTerminalSize,
  fitTerminalSize,
  parseTerminalSizePreference,
  toggleTerminalSizePreference,
  type TerminalSize,
  type TerminalSizePreference,
} from '@/sys0/terminal_size'

const STORAGE_KEY = 'sudoerofmyself:terminal-size'
const controllers = new WeakMap<HTMLElement, { dispose(): void }>()

interface TerminalSizeOptions {
  app: HTMLElement
  shell: HTMLElement
  container: HTMLElement
  term: Pick<Term, 'cols' | 'rows' | 'resize' | 'focus'>
}

export const setupTerminalSize = ({ app, shell, container, term }: TerminalSizeOptions) => {
  controllers.get(container)?.dispose()
  const button = shell.querySelector<HTMLButtonElement>('#terminal-size-button') !
  const handle = shell.querySelector<HTMLButtonElement>('#terminal-resize-handle') !
  const feedback = shell.querySelector<HTMLOutputElement>('#terminal-size-feedback') !
  let preference = defaultTerminalSizePreference()
  try {
    preference = parseTerminalSizePreference(window.localStorage.getItem(STORAGE_KEY))
  }
  catch { /* Browser storage can be unavailable. */ }

  let disposed = false
  let frame: number | undefined
  let drag: {
    pointerId: number
    x: number
    y: number
    initial: TerminalSize
    cell: { width: number, height: number }
    previous: TerminalSizePreference
  } | undefined

  const persist = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preference))
    }
    catch { /* Resizing remains usable without storage. */ }
  }

  const measure = () => {
    const screen = container.querySelector<HTMLElement>('.xterm-screen')?.getBoundingClientRect()
    if (! screen?.width || ! screen.height) return
    const outer = container.getBoundingClientRect()
    const bounds = app.getBoundingClientRect()
    const style = getComputedStyle(app)
    const width = bounds.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    const height = bounds.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
    const cell = { width: screen.width / term.cols, height: screen.height / term.rows }
    return {
      cell,
      available: {
        cols: Math.floor((width - (outer.width - screen.width)) / cell.width + 0.001),
        rows: Math.floor((height - (outer.height - screen.height)) / cell.height + 0.001),
      },
    }
  }

  const render = () => {
    const text = `${term.cols} × ${term.rows}`
    const fit = preference.mode === 'fit'
    feedback.value = text
    const title = `${fit ? 'Fit to window' : 'Custom'} (${text}) — switch to ${fit ? 'Custom' : 'Fit to window'}`
    button.title = title
    button.setAttribute('aria-label', title)
    button.dataset.mode = fit ? 'fit' : 'custom'
    button.setAttribute('aria-pressed', String(fit))
    handle.setAttribute('aria-label', `Drag to resize terminal (${text})`)
  }

  const apply = () => {
    if (disposed) return
    const metrics = measure()
    if (metrics) {
      const size = fitTerminalSize(preference, metrics.available)
      if (size.cols !== term.cols || size.rows !== term.rows) term.resize(size.cols, size.rows)
    }
    render()
  }

  const schedule = () => {
    if (disposed || frame !== undefined) return
    frame = requestAnimationFrame(() => {
      frame = undefined
      apply()
    })
  }

  const listeners = new AbortController()
  const listen = <K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
  ) => element.addEventListener(type, listener, { signal: listeners.signal })

  listen(button, 'click', () => {
    finishDrag(true)
    preference = toggleTerminalSizePreference(preference)
    apply()
    persist()
    term.focus()
  })

  const finishDrag = (cancelled: boolean) => {
    if (! drag) return
    const { pointerId, previous } = drag
    drag = undefined
    if (cancelled) preference = previous
    apply()
    if (! cancelled) persist()
    feedback.hidden = true
    shell.classList.remove('terminal-shell--resizing')
    if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId)
    term.focus()
  }

  listen(handle, 'pointerdown', (event) => {
    if (event.button !== 0 || drag) return
    const metrics = measure()
    if (! metrics) return
    event.preventDefault()
    handle.focus()
    drag = {
      pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      initial: { cols: term.cols, rows: term.rows }, cell: metrics.cell, previous: preference,
    }
    handle.setPointerCapture(event.pointerId)
    feedback.hidden = false
    shell.classList.add('terminal-shell--resizing')
  })
  listen(handle, 'pointermove', (event) => {
    if (! drag || drag.pointerId !== event.pointerId) return
    const metrics = measure()
    if (! metrics) return
    const requested = dragTerminalSize(drag.initial, {
      x: event.clientX - drag.x, y: event.clientY - drag.y,
    }, drag.cell)
    preference = { mode: 'fixed', ...fitTerminalSize({ mode: 'fixed', ...requested }, metrics.available) }
    schedule()
  })
  listen(handle, 'pointerup', (event) => {
    if (drag?.pointerId === event.pointerId) finishDrag(false)
  })
  listen(handle, 'pointercancel', (event) => {
    if (drag?.pointerId === event.pointerId) finishDrag(true)
  })
  listen(handle, 'lostpointercapture', () => finishDrag(true))
  listen(handle, 'keydown', (event) => {
    if (event.key === 'Escape' && drag) {
      event.preventDefault()
      finishDrag(true)
    }
  })

  const onViewportResize = () => {
    finishDrag(true)
    schedule()
  }
  window.addEventListener('resize', onViewportResize, { signal: listeners.signal })
  window.addEventListener('blur', () => finishDrag(true), { signal: listeners.signal })
  document.addEventListener('fullscreenchange', onViewportResize, { signal: listeners.signal })
  const observer = new ResizeObserver(schedule)
  observer.observe(app)
  const screen = container.querySelector('.xterm-screen')
  if (screen) observer.observe(screen)
  void document.fonts?.ready.then(schedule)
  button.hidden = false
  handle.hidden = false
  apply()
  schedule()

  const controller = {
    dispose: () => {
      if (disposed) return
      disposed = true
      finishDrag(true)
      if (frame !== undefined) cancelAnimationFrame(frame)
      observer.disconnect()
      listeners.abort()
      button.hidden = true
      handle.hidden = true
      controllers.delete(container)
    },
  }
  controllers.set(container, controller)
  return controller
}
