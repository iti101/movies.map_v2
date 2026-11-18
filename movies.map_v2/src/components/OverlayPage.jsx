import { useEffect, useRef } from 'react'
import { useEscape } from '../hooks/useEscape.js'
import { cn } from '../lib/format.js'
import Button from './Button.jsx'
import './OverlayPage.css'

/** Full-screen overlay. `active={false}` keeps it mounted but hidden/inert under another overlay. */
export default function OverlayPage({
  className,
  contentClass,
  backClass,
  onBack,
  labelledBy,
  before,
  children,
  active = true,
}) {
  const rootRef = useRef(null)

  useEscape(active, onBack)

  useEffect(() => {
    if (active) rootRef.current?.focus()
  }, [active])

  return (
    <article
      ref={rootRef}
      className={cn('overlay-page', !active && 'overlay-page--buried', className)}
      tabIndex={-1}
      role="dialog"
      aria-modal={active ? 'true' : undefined}
      aria-hidden={active ? undefined : true}
      inert={active ? undefined : true}
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
