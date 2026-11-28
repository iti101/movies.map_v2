import { cn } from '../lib/format.js'

/**
 * Shared loading / error / empty copy. Extra class names keep page-specific
 * spacing (centered detail status vs body text vs search messages).
 */
export default function StatusCopy({
  status,
  error,
  loading = 'Loading…',
  empty,
  className,
}) {
  const classes = cn('ui-status', className)

  if (status === 'loading') return <p className={classes}>{loading}</p>
  if (status === 'error') return <p className={cn(classes, 'ui-status--error')}>{error}</p>
  if (status === 'empty' && empty) return <p className={classes}>{empty}</p>
  return null
}
