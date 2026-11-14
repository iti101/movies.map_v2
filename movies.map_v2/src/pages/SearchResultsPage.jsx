import { useEffect, useState } from 'react'
import { getSearchLabel, getSearchSuggestion, searchTmdbAll } from '../API/tmdb.js'
import { isAbortError } from '../API/tmdb/client.js'
import DidYouMean from '../components/DidYouMean.jsx'
import OverlayPage from '../components/OverlayPage.jsx'
import ResultGrid from '../components/ResultGrid.jsx'
import './SearchResultsPage.css'

function searchKeyOf(search) {
  return `${search.query ?? ''}|${search.type}|${search.year ?? ''}|${search.genre?.id ?? ''}`
}

/**
 * Full-screen “See all” overlay. Shows the first page immediately, then
 * replaces it with up to 10 TMDB pages. If that deeper fetch fails, keep the seed.
 */
function SearchResultsPage({ search, onBack, onSelect }) {
  const [queryOverride, setQueryOverride] = useState(null)
  const searchKey = searchKeyOf(search)
  const activeSearch =
    queryOverride?.key === searchKey
      ? { ...search, query: queryOverride.query, results: [] }
      : search
  const activeKey = searchKeyOf(activeSearch)
  const seeded = activeSearch.results ?? []

  const [fetched, setFetched] = useState(null)
  const [suggestion, setSuggestion] = useState({ key: '', value: '' })
  const [error, setError] = useState('')

  const results = fetched?.key === activeKey ? fetched.items : seeded
  const status =
    fetched?.key === activeKey
      ? fetched.items.length
        ? 'success'
        : 'empty'
      : seeded.length
        ? 'success'
        : error
          ? 'error'
          : 'loading'

  useEffect(() => {
    const controller = new AbortController()
    const key = activeKey

    searchTmdbAll({
      query: activeSearch.query,
      type: activeSearch.type,
      year: activeSearch.year,
      genre: activeSearch.genre,
      signal: controller.signal,
    })
      .then(async (items) => {
        setFetched({ key, items })
        const nextSuggestion = await getSearchSuggestion({
          query: activeSearch.query,
          type: activeSearch.type,
          year: activeSearch.year,
          items,
          signal: controller.signal,
        })
        if (!controller.signal.aborted) {
          setSuggestion({ key, value: nextSuggestion ?? '' })
        }
      })
      .catch((err) => {
        if (isAbortError(err) || seeded.length) return
        setError(err.message || 'Something went wrong.')
      })

    return () => controller.abort()
  }, [activeKey, activeSearch.query, activeSearch.type, activeSearch.year, activeSearch.genre, seeded.length])

  const label = getSearchLabel(activeSearch)
  const count = results.length
  const summary =
    count > 0
      ? `${count} result${count === 1 ? '' : 's'} for “${label}”`
      : `Results for “${label}”`

  return (
    <OverlayPage
      className="results-page"
      contentClass="results-page__inner"
      backClass="results-page__back"
      onBack={onBack}
      labelledBy="results-title"
    >
      <header className="results-page__header">
        <h1 id="results-title" className="results-page__title">
          Results
        </h1>
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
          suggestion={suggestion.key === activeKey ? suggestion.value : ''}
          onAccept={(nextQuery) => setQueryOverride({ key: searchKey, query: nextQuery })}
        />
      )}

      {count > 0 && (
        <ResultGrid items={results} onSelect={onSelect} className="search-grid results-page__grid" />
      )}
    </OverlayPage>
  )
}

export default SearchResultsPage
