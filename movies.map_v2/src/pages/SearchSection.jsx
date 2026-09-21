import { useEffect, useState } from 'react'
import Button from '../components/Button.jsx'
import SearchCard from '../components/SearchCard.jsx'
import { applySearchFilters, fetchTmdbPage, getSearchLabel, isValidYear, loadGenres } from '../API/tmdb.js'
import searchIcon from '../assets/search_opsz24.svg'
import './SearchSection.css'

const TYPE_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'TV' },
  { id: 'person', label: 'People' },
]

function SearchSection({ onSeeAll }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('movie')
  const [releaseDateOn, setReleaseDateOn] = useState(false)
  const [year, setYear] = useState('')
  const [genreOn, setGenreOn] = useState(false)
  const [genres, setGenres] = useState([])
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [searchedQuery, setSearchedQuery] = useState('')

  const filtersDisabled = type === 'person'
  const hasResults = status === 'success' && results.length > 0
  const yearFilter = releaseDateOn && isValidYear(year) ? year : ''

  useEffect(() => {
    if (!genreOn || filtersDisabled) {
      setGenres([])
      return
    }

    let cancelled = false
    loadGenres(type)
      .then((list) => { if (!cancelled) setGenres(list) })
      .catch(() => { if (!cancelled) setGenres([]) })

    return () => { cancelled = true }
  }, [genreOn, filtersDisabled, type])

  async function handleSubmit(event) {
    event.preventDefault()

    const trimmed = query.trim()
    if (!trimmed && !yearFilter) {
      setStatus('idle')
      setResults([])
      setError('')
      setSearchedQuery('')
      return
    }

    setStatus('loading')
    setError('')
    setSearchedQuery(trimmed)

    try {
      const { items } = await fetchTmdbPage({
        query: trimmed,
        type,
        year: yearFilter,
        genre: selectedGenre,
      })
      const filtered = applySearchFilters(items, {
        type,
        year: yearFilter,
        genre: selectedGenre,
      })
      setResults(filtered)
      setStatus(filtered.length === 0 ? 'empty' : 'success')
    } catch (err) {
      setResults([])
      setStatus('error')
      setError(err.message || 'Something went wrong.')
    }
  }

  function selectType(nextType) {
    setType(nextType)
    setSelectedGenre(null)
    if (nextType === 'person') {
      setReleaseDateOn(false)
      setYear('')
      setGenreOn(false)
    }
  }

  function toggleReleaseDate() {
    setReleaseDateOn((on) => {
      if (on) setYear('')
      return !on
    })
  }

  function toggleGenre() {
    setGenreOn((on) => {
      if (on) setSelectedGenre(null)
      return !on
    })
  }

  function handleSeeAll() {
    onSeeAll?.({
      query: searchedQuery,
      type,
      year: yearFilter,
      genre: selectedGenre,
      results,
    })
  }

  const searchLabel = getSearchLabel({ query: searchedQuery, year: yearFilter })

  return (
    <div className={`search-section${hasResults || status === 'empty' ? ' search-section--has-results' : ''}`}>
      <h2 className="search-title">Search</h2>

      <form className="search-form" onSubmit={handleSubmit} role="search">
        <div className="search-bar">
          <input
            className="search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Movies, shows, people..."
            aria-label="Search movies, shows, and people"
            autoComplete="off"
          />
          <Button
            className="search-submit"
            type="submit"
            variant="icon"
            round
            background="accent-btn"
            hoverBackground="accent-btn-hover"
            disabled={status === 'loading'}
            aria-label={status === 'loading' ? 'Searching' : 'Search'}
          >
            <img src={searchIcon} alt="" className="search-submit-icon" />
          </Button>
        </div>

        <div className="search-chips">
          {TYPE_OPTIONS.map((option) => (
            <Button
              key={option.id}
              active={type === option.id}
              onClick={() => selectType(option.id)}
            >
              {option.label}
            </Button>
          ))}
          <Button
            active={releaseDateOn}
            onClick={toggleReleaseDate}
            disabled={filtersDisabled}
          >
            Release date
          </Button>
          <Button
            active={genreOn}
            onClick={toggleGenre}
            disabled={filtersDisabled}
          >
            Genre
          </Button>
        </div>

        {releaseDateOn && (
          <input
            className="search-year"
            type="text"
            inputMode="numeric"
            value={year}
            onChange={(event) => setYear(event.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="YYYY"
            aria-label="Release year"
          />
        )}

        {genreOn && (
          <div className="search-genres">
            {genres.map((genre) => (
              <Button
                key={genre.id}
                active={selectedGenre?.id === genre.id}
                onClick={() =>
                  setSelectedGenre((current) => (current?.id === genre.id ? null : genre))
                }
              >
                {genre.name}
              </Button>
            ))}
          </div>
        )}
      </form>

      <div className="search-results" aria-live="polite">
        {status === 'loading' && <p className="search-message">Searching…</p>}

        {status === 'error' && (
          <p className="search-message search-message-error">{error}</p>
        )}

        {status === 'empty' && (
          <p className="search-message">No results found for “{searchLabel}”.</p>
        )}

        {status === 'success' && (
          <>
            <div className="search-results-header">
              <Button onClick={handleSeeAll}>See all</Button>
            </div>
            <ul className="search-grid">
              {results.map((item) => (
                <SearchCard key={`${item.mediaType}-${item.id}`} item={item} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

export default SearchSection
