import { getImageUrl } from '../API/tmdb.js'
import { cn } from '../lib/format.js'

export default function MediaImage({ path, size, alt, className, empty, lazy = false }) {
  const src = getImageUrl(path, size)
  if (!src) {
    return (
      <span className={cn(className, className && `${className}--placeholder`)} aria-hidden="true">
        {empty}
      </span>
    )
  }
  return <img className={className} src={src} alt={alt} loading={lazy ? 'lazy' : undefined} />
}
