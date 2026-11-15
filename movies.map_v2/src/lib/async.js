export function isAbortError(error) {
  return error?.name === 'AbortError'
}

export function waitWithSignal(pending, signal) {
  if (!signal) return pending
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))

  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
    signal.addEventListener('abort', onAbort, { once: true })
    pending.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        if (signal.aborted) reject(new DOMException('Aborted', 'AbortError'))
        else resolve(value)
      },
      (error) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      },
    )
  })
}

export function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const id = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(id)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}
