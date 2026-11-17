import { useEffect, useRef } from 'react'

const stack = []

/**
 * Innermost active handler wins, so Escape can close a modal or episode
 * accordion without also dismissing the overlay underneath.
 */
export function useEscape(active, onEscape) {
  const onEscapeRef = useRef(onEscape)

  useEffect(() => {
    onEscapeRef.current = onEscape
  }, [onEscape])

  useEffect(() => {
    if (!active) return undefined

    function onKeyDown(event) {
      if (event.key !== 'Escape') return
      if (stack.at(-1) !== onKeyDown) return
      event.preventDefault()
      onEscapeRef.current(event)
    }

    stack.push(onKeyDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      const index = stack.lastIndexOf(onKeyDown)
      if (index >= 0) stack.splice(index, 1)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [active])
}
