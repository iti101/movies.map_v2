import Button from '../components/Button.jsx'
import ChipRow from '../components/ChipRow.jsx'
import ResultGrid from '../components/ResultGrid.jsx'
import SearchStatus from '../components/SearchStatus.jsx'
import { cn } from '../lib/format.js'
import { SEARCH_TYPES } from '../lib/media.js'
import searchIcon from '../assets/search_opsz24.svg'
import { useSearch } from './search/useSearch.js'
import './SearchSection.css'

/**
 * Search snap-page: one TMDB page of posters plus chips.
 * Submit needs a title, a 4-digit year, or a selected genre.
 */
function SearchSection({ onSeeAll, onSelect }) {
  const {
    query,
    setQuery,
    type,
    releaseDateOn,
    year,
    setYear,
    genreOn,
    selectedGenre,
    setSelectedGenre,
    results,
    suggestion,
    status,
    error,
    genres,
    genresLoading,
    filtersDisabled,
    hasResults,
    searchLabel,
    handleSubmit,
    handleAcceptSuggestion,
    selectType,
    toggleReleaseDate,
    toggleGenre,
    handleSeeAll,
  } = useSearch({ onSeeAll })

  return (
    <div className={cn('search-section', (hasResults || status === 'empty') && 'search-section--has-results')}>
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

        <ChipRow
          className="search-chips"
          items={SEARCH_TYPES}
          selected={type}
          onSelect={(option) => selectType(option.id)}
        >
          <Button active={releaseDateOn} onClick={toggleReleaseDate} disabled={filtersDisabled}>
            Release date
          </Button>
          <Button active={genreOn} onClick={toggleGenre} disabled={filtersDisabled}>
            Genre
          </Button>
        </ChipRow>

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
            loading={genresLoading}
            loadingLabel="Loading genres…"
            messageClassName="search-message"
            items={genres}
            selected={selectedGenre}
            onSelect={(genre) =>
              setSelectedGenre((current) => (current?.id === genre.id ? null : genre))
            }
          />
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
