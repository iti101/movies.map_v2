import { useEffect } from 'react'

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** `/` jumps to search unless the user is already typing in a field. */
export function useSearchHotkey(onTrigger) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      if (TYPING_TAGS.has(event.target.tagName) || event.target.isContentEditable) return
      event.preventDefault()
      onTrigger()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onTrigger])
}
