import { useEffect, useState } from 'react'
import {
  applySearchFilters,
  fetchTmdbPage,
  getSearchLabel,
  getSearchSuggestion,
  isValidYear,
  loadGenres,
} from '../API/tmdb.js'
import { isAbortError } from '../API/tmdb/client.js'
import Button from '../components/Button.jsx'
import ChipRow from '../components/ChipRow.jsx'
import DidYouMean from '../components/DidYouMean.jsx'
import ResultGrid from '../components/ResultGrid.jsx'
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
  const [genres, setGenres] = useState([])
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [searchedQuery, setSearchedQuery] = useState('')
  const [suggestion, setSuggestion] = useState('')

  const filtersDisabled = type === 'person'
  const hasResults = status === 'success' && results.length > 0
  const yearFilter = releaseDateOn && isValidYear(year) ? year : ''
  const genreFilter = genreOn && !filtersDisabled ? selectedGenre : null

  useEffect(() => {
    if (!genreOn || filtersDisabled) return undefined

    const controller = new AbortController()
    loadGenres(type, { signal: controller.signal })
      .then((list) => setGenres(list))
      .catch((err) => {
        if (!isAbortError(err)) setGenres([])
      })

    return () => controller.abort()
  }, [genreOn, filtersDisabled, type])

  async function runSearch(nextQuery = query) {
    const trimmed = nextQuery.trim()
    if (!trimmed && !yearFilter && !genreFilter) {
      setStatus('idle')
      setResults([])
      setError('')
      setSearchedQuery('')
      setSuggestion('')
      return
    }

    setStatus('loading')
    setError('')
    setSearchedQuery(trimmed)
    setSuggestion('')

    try {
      const { items } = await fetchTmdbPage({
        query: trimmed,
        type,
        year: yearFilter,
        genre: genreFilter,
      })
      const filtered = applySearchFilters(items, {
        type,
        year: yearFilter,
        genre: genreFilter,
      })
      setResults(filtered)
      setSuggestion(
        (await getSearchSuggestion({
          query: trimmed,
          type,
          year: yearFilter,
          items,
        })) ?? '',
      )
      setStatus(filtered.length === 0 ? 'empty' : 'success')
    } catch (err) {
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
    onSeeAll?.({
      query: searchedQuery,
      type,
      year: yearFilter,
      genre: genreFilter,
      results,
    })
  }

  const searchLabel = getSearchLabel({
    query: searchedQuery,
    year: yearFilter,
    genre: genreFilter,
  })

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
          <ChipRow
            className="search-genres"
            items={genres}
            isActive={(genre) => selectedGenre?.id === genre.id}
            onSelect={(genre) =>
              setSelectedGenre((current) => (current?.id === genre.id ? null : genre))
            }
          />
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

        {(status === 'empty' || status === 'success') && (
          <DidYouMean suggestion={suggestion} onAccept={handleAcceptSuggestion} />
        )}

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
