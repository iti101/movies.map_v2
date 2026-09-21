import { useEffect, useState } from 'react'
import Button from '../components/Button.jsx'
import DidYouMean from '../components/DidYouMean.jsx'
import MovieCard from '../components/MovieCard.jsx'
import { getSearchLabel, getSearchSuggestion, searchTmdbAll } from '../API/tmdb.js'
import './SearchResultsPage.css'

function SearchResultsPage({ search, onBack, onSelect }) {
  const [activeSearch, setActiveSearch] = useState(search)
  const seeded = activeSearch.results ?? []
  const [results, setResults] = useState(seeded)
  const [status, setStatus] = useState(seeded.length ? 'success' : 'loading')
  const [error, setError] = useState('')
  const [suggestion, setSuggestion] = useState('')

  useEffect(() => {
    setActiveSearch(search)
  }, [search])

  useEffect(() => {
    let cancelled = false
    const preseeded = activeSearch.results ?? []

    setResults(preseeded)
    setStatus(preseeded.length ? 'success' : 'loading')
    setError('')
    setSuggestion('')

    searchTmdbAll({
      query: activeSearch.query,
      type: activeSearch.type,
      year: activeSearch.year,
      genre: activeSearch.genre,
    })
      .then(async (items) => {
        if (cancelled) return
        setResults(items)
        setStatus(items.length === 0 ? 'empty' : 'success')
        const nextSuggestion = await getSearchSuggestion({
          query: activeSearch.query,
          type: activeSearch.type,
          year: activeSearch.year,
          items,
        })
        if (!cancelled) setSuggestion(nextSuggestion ?? '')
      })
      .catch((err) => {
        if (cancelled || preseeded.length) return
        setStatus('error')
        setError(err.message || 'Something went wrong.')
      })

    return () => { cancelled = true }
  }, [activeSearch])

  const label = getSearchLabel(activeSearch)
  const count = results.length
  const summary =
    count > 0
      ? `${count} result${count === 1 ? '' : 's'} for “${label}”`
      : `Results for “${label}”`

  return (
    <main className="results-page">
      <div className="results-page__inner">
        <Button className="results-page__back" onClick={onBack}>
          Back
        </Button>

        <header className="results-page__header">
          <h1 className="results-page__title">Results</h1>
          <p className="results-page__query">{summary}</p>
        </header>

        {status === 'loading' && <p className="search-message">Searching…</p>}

        {status === 'error' && (
          <p className="search-message search-message-error">{error}</p>
        )}

        {status === 'empty' && (
          <p className="search-message">No results found for “{label}”.</p>
        )}

        {(status === 'empty' || status === 'success') && (
          <DidYouMean
            suggestion={suggestion}
            onAccept={(nextQuery) =>
              setActiveSearch({ ...activeSearch, query: nextQuery, results: [] })
            }
          />
        )}

        {count > 0 && (
          <ul className="search-grid results-page__grid">
            {results.map((item) => (
              <MovieCard key={`${item.mediaType}-${item.id}`} item={item} onSelect={onSelect} />
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

export default SearchResultsPage
