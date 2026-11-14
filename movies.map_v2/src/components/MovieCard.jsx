import { MEDIA_LABELS } from '../API/tmdb.js'
import MediaImage from './MediaImage.jsx'
import './MovieCard.css'

function MovieCard({ item, onSelect, className = '', children }) {
  const year = item.year || (item.date ? item.date.slice(0, 4) : null)
  const subtitle = year || MEDIA_LABELS[item.mediaType] || item.mediaType

  return (
    <li className={['movie-card', className].filter(Boolean).join(' ')}>
      <button type="button" className="movie-card__open" onClick={() => onSelect?.(item)}>
        <MediaImage
          className="movie-card__poster"
          path={item.imagePath}
          size="w342"
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
