import { useEffect, useState } from 'react'
import { getSearchLabel, getSearchSuggestion, searchKeyOf, searchTmdbAll } from '../../API/tmdb.js'
import { isAbortError } from '../../lib/async.js'
import { pluralize } from '../../lib/format.js'

/**
 * See-all overlay: paint the first page immediately, then fill later TMDB pages.
 * If the deeper fetch fails, keep the seed results on screen.
 */
export function useSeeAllResults(search) {
  const seedKey = searchKeyOf(search)
  const [queryOverride, setQueryOverride] = useState(null)
  const activeSearch =
    queryOverride?.key === seedKey
      ? { ...search, query: queryOverride.query, results: [], totalPages: 0 }
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
      seedItems: activeSearch.results,
      totalPages: activeSearch.totalPages,
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
  const summary =
    count > 0 ? `${pluralize(count, 'result')} for “${label}”` : `Results for “${label}”`

  return {
    status,
    error: activeError,
    results,
    suggestion,
    label,
    summary,
    acceptSuggestion(nextQuery) {
      setQueryOverride({ key: seedKey, query: nextQuery })
    },
  }
}
