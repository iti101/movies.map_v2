import { useEffect, useRef } from 'react'
import { useEscape } from '../hooks/useEscape.js'
import './Modal.css'

export default function Modal({
  open,
  onClose,
  labelledBy,
  overlayClass = 'modal-overlay',
  dialogClass = 'modal-dialog',
  children,
}) {
  const dialogRef = useRef(null)

  useEscape(open, onClose)

  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => {
      const root = dialogRef.current
      const focusable =
        root?.querySelector('input, textarea, select') ?? root?.querySelector('button')
      focusable?.focus()
    }, 0)
    return () => {
      document.body.style.overflow = previous
      window.clearTimeout(timer)
    }
  }, [open])

  if (!open) return null

  return (
    <div className={overlayClass} onClick={onClose}>
      <div
        ref={dialogRef}
        className={dialogClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
