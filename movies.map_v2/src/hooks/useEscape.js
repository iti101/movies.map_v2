import { useEffect } from 'react'

export function useEscape(active, onEscape) {
  useEffect(() => {
    if (!active) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') onEscape(event)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, onEscape])
}
