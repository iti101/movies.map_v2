import { useEffect, useState } from 'react'
import Button from '../components/Button.jsx'
import SearchCard from '../components/SearchCard.jsx'
import { getSearchLabel, searchTmdbAll } from '../API/tmdb.js'
import './SearchResultsPage.css'

/**
 * Full-screen “See all” overlay. Shows the first page immediately, then
 * replaces it with up to 10 TMDB pages. If that deeper fetch fails, keep the seed.
 */
function SearchResultsPage({ search, onBack }) {
  const seeded = search.results ?? []
  const [results, setResults] = useState(seeded)
  const [status, setStatus] = useState(seeded.length ? 'success' : 'loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const preseeded = search.results ?? []

    setResults(preseeded)
    setStatus(preseeded.length ? 'success' : 'loading')
    setError('')

    searchTmdbAll({
      query: search.query,
      type: search.type,
      year: search.year,
      genre: search.genre,
    })
      .then((items) => {
        if (cancelled) return
        setResults(items)
        setStatus(items.length === 0 ? 'empty' : 'success')
      })
      .catch((err) => {
        if (cancelled || preseeded.length) return
        setStatus('error')
        setError(err.message || 'Something went wrong.')
      })

    return () => { cancelled = true }
  }, [search])

  const label = getSearchLabel(search)
  const count = results.length
  const summary =
    count > 0
      ? `${count} result${count === 1 ? '' : 's'} for “${label}”`
      : `Results for “${label}”`

  return (
    <main className="results-page">
      <div className="results-page__inner">
        <Button variant="ghost" className="results-page__back" onClick={onBack}>
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

        {count > 0 && (
          <ul className="search-grid results-page__grid">
            {results.map((item) => (
              <SearchCard key={`${item.mediaType}-${item.id}`} item={item} />
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

export default SearchResultsPage
