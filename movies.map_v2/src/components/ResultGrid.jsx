import { mediaKey } from '../lib/media.js'
import { cn } from '../lib/format.js'
import MovieCard from './MovieCard.jsx'
import './ResultGrid.css'

export default function ResultGrid({
  items,
  onSelect,
  className,
  cardClassName,
  renderExtra,
}) {
  return (
    <ul className={cn('poster-grid', className)}>
      {items.map((item) => (
        <MovieCard
          key={mediaKey(item)}
          className={cardClassName}
          item={item}
          onSelect={onSelect}
        >
          {renderExtra?.(item)}
        </MovieCard>
      ))}
    </ul>
  )
}
