import { useState } from 'react'
import {
  applySearchFilters,
  fetchTmdbPage,
  getSearchLabel,
  getSearchSuggestion,
  isValidYear,
} from '../API/tmdb.js'
import Button from '../components/Button.jsx'
import ChipRow from '../components/ChipRow.jsx'
import ResultGrid from '../components/ResultGrid.jsx'
import SearchStatus from '../components/SearchStatus.jsx'
import { useGenres } from '../hooks/useGenres.js'
import { useLatestAbort } from '../hooks/useLatestAbort.js'
import { isAbortError } from '../lib/async.js'
import { SEARCH_TYPES } from '../lib/media.js'
import searchIcon from '../assets/search_opsz24.svg'
import './SearchSection.css'

/**
 * Search snap-page: one TMDB page of posters plus chips.
 * Submit needs a title, a 4-digit year, or a selected genre.
 */
function SearchSection({ onSeeAll, onSelect }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('movie')
  const [releaseDateOn, setReleaseDateOn] = useState(false)
  const [year, setYear] = useState('')
  const [genreOn, setGenreOn] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(null)
  const [suggestion, setSuggestion] = useState('')
  const { genres, loading: genresLoading } = useGenres(type)
  const nextSignal = useLatestAbort()

  const filtersDisabled = type === 'person'
  const hasResults = status === 'success' && results.length > 0
  const yearFilter = releaseDateOn && isValidYear(year) ? year : ''
  const genreFilter = genreOn && !filtersDisabled ? selectedGenre : null

  async function runSearch(nextQuery = query) {
    const trimmed = nextQuery.trim()
    const nextSubmitted = {
      query: trimmed,
      type,
      year: yearFilter,
      genre: genreFilter,
    }

    if (!trimmed && !yearFilter && !genreFilter) {
      nextSignal()
      setStatus('idle')
      setResults([])
      setError('')
      setSubmitted(null)
      setSuggestion('')
      return
    }

    const signal = nextSignal()
    setStatus('loading')
    setError('')
    setSubmitted(nextSubmitted)
    setSuggestion('')

    try {
      const { items } = await fetchTmdbPage({ ...nextSubmitted, signal })
      const filtered = applySearchFilters(items, nextSubmitted)
      const nextSuggestion =
        (await getSearchSuggestion({
          ...nextSubmitted,
          items,
          signal,
        })) ?? ''
      if (signal.aborted) return
      setResults(filtered)
      setSuggestion(nextSuggestion)
      setStatus(filtered.length === 0 ? 'empty' : 'success')
    } catch (err) {
      if (isAbortError(err) || signal.aborted) return
      setResults([])
      setSuggestion('')
      setStatus('error')
      setError(err.message || 'Something went wrong.')
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    runSearch(query)
  }

  function handleAcceptSuggestion(nextQuery) {
    setQuery(nextQuery)
    runSearch(nextQuery)
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
    if (!submitted) return
    onSeeAll?.({ ...submitted, results })
  }

  const searchLabel = getSearchLabel(submitted ?? {})

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
          {SEARCH_TYPES.map((option) => (
            <Button
              key={option.id}
              active={type === option.id}
              onClick={() => selectType(option.id)}
            >
              {option.label}
            </Button>
          ))}
          <Button active={releaseDateOn} onClick={toggleReleaseDate} disabled={filtersDisabled}>
            Release date
          </Button>
          <Button active={genreOn} onClick={toggleGenre} disabled={filtersDisabled}>
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
          genresLoading ? (
            <p className="search-message">Loading genres…</p>
          ) : (
            <ChipRow
              className="search-genres"
              items={genres}
              isActive={(genre) => selectedGenre?.id === genre.id}
              onSelect={(genre) =>
                setSelectedGenre((current) => (current?.id === genre.id ? null : genre))
              }
            />
          )
        )}
      </form>

      <div className="search-results" aria-live="polite">
        <SearchStatus
          status={status}
          error={error}
          label={searchLabel}
          suggestion={suggestion}
          onAcceptSuggestion={handleAcceptSuggestion}
        />

        {status === 'success' && (
          <>
            <div className="search-results-header">
              <Button onClick={handleSeeAll}>See all</Button>
            </div>
            <ResultGrid items={results} onSelect={onSelect} />
          </>
        )}
      </div>
    </div>
  )
}

export default SearchSection
