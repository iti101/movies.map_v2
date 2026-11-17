import { mediaKey } from '../lib/media.js'
import MovieCard from './MovieCard.jsx'

export default function ResultGrid({
  items,
  onSelect,
  className = 'search-grid',
  cardClassName,
  renderExtra,
}) {
  return (
    <ul className={className}>
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
