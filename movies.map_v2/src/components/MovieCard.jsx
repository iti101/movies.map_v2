import { MEDIA_LABELS } from '../lib/media.js'
import { cn } from '../lib/format.js'
import MediaImage from './MediaImage.jsx'
import './MovieCard.css'

function MovieCard({ item, onSelect, className = '', children }) {
  const subtitle = item.year || MEDIA_LABELS[item.mediaType] || item.mediaType

  return (
    <li className={cn('movie-card', className)}>
      <button type="button" className="movie-card__open" onClick={() => onSelect?.(item)}>
        <MediaImage
          className="movie-card__poster"
          path={item.imagePath}
          size="w342"
          sizes="(max-width: 40rem) 42vw, 154px"
          alt={`${item.title} poster`}
          empty="No poster"
          lazy
        />
        <span className="movie-card__body">
          <span className="movie-card__title">{item.title}</span>
          <span className="movie-card__year">{subtitle}</span>
        </span>
      </button>
      {children}
    </li>
  )
}

export default MovieCard
