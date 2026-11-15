import { useEffect, useRef } from 'react'

/** Abort the previous run (and the in-flight one on unmount), then return a fresh signal. */
export function useLatestAbort() {
  const ref = useRef(null)

  useEffect(() => () => ref.current?.abort(), [])

  return function nextSignal() {
    ref.current?.abort()
    const controller = new AbortController()
    ref.current = controller
    return controller.signal
  }
}
