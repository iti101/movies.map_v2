import { useCallback, useState } from 'react'
import { isAbortError } from '../lib/async.js'
import { useLatestAbort } from './useLatestAbort.js'

/**
 * Imperative async helper: abort the previous run, expose loading/error,
 * and let the caller set success vs empty.
 */
export function useTask() {
  const nextSignal = useLatestAbort()
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const reset = useCallback(() => {
    nextSignal()
    setStatus('idle')
    setError('')
  }, [nextSignal])

  const run = useCallback(
    async (factory) => {
      const signal = nextSignal()
      setStatus('loading')
      setError('')
      try {
        const value = await factory(signal)
        if (signal.aborted) return { aborted: true }
        return { value, aborted: false }
      } catch (err) {
        if (isAbortError(err) || signal.aborted) return { aborted: true }
        setStatus('error')
        setError(err.message || 'Something went wrong.')
        return { aborted: false, error: err }
      }
    },
    [nextSignal],
  )

  return { status, error, setStatus, run, reset }
}
