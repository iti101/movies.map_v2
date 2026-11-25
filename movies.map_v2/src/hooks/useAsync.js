import { useEffect, useState } from 'react'
import { isAbortError } from '../lib/async.js'

/**
 * Load data whenever `deps` change. Pass `{ keepPreviousData: true }` to leave
 * the last successful value on screen while the next request is in flight.
 */
export function useAsync(factory, deps, { keepPreviousData = false } = {}) {
  const [status, setStatus] = useState('loading')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let started = false

    Promise.resolve()
      .then(() => {
        if (controller.signal.aborted) return
        started = true
        setStatus('loading')
        setError('')
        if (!keepPreviousData) setData(null)
        return factory(controller.signal)
      })
      .then((value) => {
        if (controller.signal.aborted || !started) return
        setData(value)
        setStatus('success')
      })
      .catch((err) => {
        if (controller.signal.aborted || isAbortError(err)) return
        if (!keepPreviousData) setData(null)
        setStatus('error')
        setError(err.message || 'Something went wrong.')
      })

    return () => controller.abort()
    // Factory identity (and keepPreviousData) is owned by the caller via deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { status, data, error, setData, setStatus, setError }
}
