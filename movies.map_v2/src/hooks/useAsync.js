import { useEffect, useState } from 'react'
import { isAbortError } from '../API/tmdb/client.js'

export function useAsync(factory, deps) {
  const [status, setStatus] = useState('loading')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    Promise.resolve()
      .then(() => {
        if (controller.signal.aborted) return null
        setStatus('loading')
        setError('')
        return factory(controller.signal)
      })
      .then((value) => {
        if (controller.signal.aborted || value === null) return
        setData(value)
        setStatus('success')
      })
      .catch((err) => {
        if (controller.signal.aborted || isAbortError(err)) return
        setData(null)
        setStatus('error')
        setError(err.message || 'Something went wrong.')
      })

    return () => controller.abort()
    // Factory identity is owned by the caller via deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { status, data, error, setData, setStatus, setError }
}
