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
  return (
    <article
      className={cn('overlay-page', className)}
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
