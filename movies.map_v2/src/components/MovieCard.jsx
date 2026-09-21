import { getImageUrl, MEDIA_LABELS } from '../API/tmdb.js'
import './MovieCard.css'

function MovieCard({ item, onSelect }) {
  const posterUrl = getImageUrl(item.imagePath, 'w342')
  const year = item.year || (item.date ? item.date.slice(0, 4) : null)
  const subtitle = year || MEDIA_LABELS[item.mediaType] || item.mediaType

  return (
    <li className="movie-card">
      <button type="button" className="movie-card__open" onClick={() => onSelect?.(item)}>
        {posterUrl ? (
          <img
            className="movie-card__poster"
            src={posterUrl}
            alt={`${item.title} poster`}
            loading="lazy"
          />
        ) : (
          <span
            className="movie-card__poster movie-card__poster--placeholder"
            aria-hidden="true"
          >
            No poster
          </span>
        )}

        <span className="movie-card__body">
          <span className="movie-card__title">{item.title}</span>
          <span className="movie-card__year">{subtitle}</span>
        </span>
      </button>
    </li>
  )
}

export default MovieCard
