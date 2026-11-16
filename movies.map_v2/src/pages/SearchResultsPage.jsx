import { useEffect, useState } from 'react'
import { getSearchLabel, getSearchSuggestion, searchTmdbAll } from '../API/tmdb.js'
import OverlayPage from '../components/OverlayPage.jsx'
import ResultGrid from '../components/ResultGrid.jsx'
import SearchStatus from '../components/SearchStatus.jsx'
import { isAbortError } from '../lib/async.js'
import { pluralize } from '../lib/format.js'
import './SearchResultsPage.css'

function searchKeyOf(search) {
  return `${search.query ?? ''}|${search.type}|${search.year ?? ''}|${search.genre?.id ?? ''}`
}

/**
 * Full-screen “See all” overlay. Shows the first page immediately, then
 * replaces it with up to 10 TMDB pages. If that deeper fetch fails, keep the seed.
 */
function SearchResultsPage({ search, onBack, onSelect }) {
  const seedKey = searchKeyOf(search)
  const [queryOverride, setQueryOverride] = useState(null)
  const activeSearch =
    queryOverride?.key === seedKey
      ? { ...search, query: queryOverride.query, results: [] }
      : search
  const activeKey = searchKeyOf(activeSearch)
  const seeded = activeSearch.results ?? []

  const [fetched, setFetched] = useState(null)
  const [suggestion, setSuggestion] = useState('')
  const [error, setError] = useState({ key: '', value: '' })

  const results = fetched?.key === activeKey ? fetched.items : seeded
  const activeError = error.key === activeKey ? error.value : ''
  const status =
    fetched?.key === activeKey
      ? fetched.items.length
        ? 'success'
        : 'empty'
      : seeded.length
        ? 'success'
        : activeError
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
          setSuggestion(nextSuggestion ?? '')
        }
      })
      .catch((err) => {
        if (isAbortError(err) || seeded.length) return
        setError({ key, value: err.message || 'Something went wrong.' })
      })

    return () => {
      controller.abort()
      setSuggestion('')
    }
    // activeKey is the serialized search; reading fields from that same render is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey])

  const label = getSearchLabel(activeSearch)
  const count = results.length
  const summary = count > 0 ? `${pluralize(count, 'result')} for “${label}”` : `Results for “${label}”`

  return (
    <OverlayPage
      className="results-page"
      contentClass="results-page__inner"
      onBack={onBack}
      labelledBy="results-title"
    >
      <header className="results-page__header">
        <h1 id="results-title" className="results-page__title">
          Results
        </h1>
        <p className="results-page__query">{summary}</p>
      </header>

      <SearchStatus
        status={status}
        error={activeError}
        label={label}
        suggestion={status === 'empty' || status === 'success' ? suggestion : ''}
        onAcceptSuggestion={(nextQuery) => setQueryOverride({ key: seedKey, query: nextQuery })}
      />

      {count > 0 && (
        <ResultGrid items={results} onSelect={onSelect} className="search-grid results-page__grid" />
      )}
    </OverlayPage>
  )
}

export default SearchResultsPage
