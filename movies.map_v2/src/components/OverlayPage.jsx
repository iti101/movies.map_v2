import { useEffect, useRef } from 'react'
import { useEscape } from '../hooks/useEscape.js'
import { cn } from '../lib/format.js'
import Button from './Button.jsx'
import './OverlayPage.css'

export default function OverlayPage({
  className,
  contentClass,
  backClass,
  onBack,
  labelledBy,
  before,
  children,
}) {
  const rootRef = useRef(null)

  useEscape(true, onBack)

  useEffect(() => {
    rootRef.current?.focus()
  }, [])

  return (
    <article
      ref={rootRef}
      className={cn('overlay-page', className)}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      {before}
      <div className={cn('overlay-page__content', contentClass)}>
        <Button className={cn('overlay-page__back', backClass)} onClick={onBack}>
          Back
        </Button>
        {children}
      </div>
    </article>
  )
}
