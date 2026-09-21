import { POSTER_BASE } from '../API/tmdb.js'

export default function SearchCard({ item }) {
  const posterSrc = item.imagePath ? `${POSTER_BASE}${item.imagePath}` : null

  return (
    <li className="search-card">
      {posterSrc ? (
        <img className="search-poster" src={posterSrc} alt="" loading="lazy" />
      ) : (
        <div className="search-poster search-poster-fallback" aria-hidden="true">
          No poster
        </div>
      )}
      <div className="search-card-meta">
        <h3 className="search-card-title">{item.title}</h3>
        {item.year && <p className="search-card-year">{item.year}</p>}
      </div>
    </li>
  )
}
