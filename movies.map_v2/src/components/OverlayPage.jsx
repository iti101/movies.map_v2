import Button from './Button.jsx'

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
      className={className}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      {before}
      <div className={contentClass}>
        <Button className={backClass} onClick={onBack}>
          Back
        </Button>
        {children}
      </div>
    </article>
  )
}
