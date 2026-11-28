import { useState } from 'react'
import { getSearchLabel, searchAllWithSuggestion, searchKeyOf } from '../../API/tmdb.js'
import { useAsync } from '../../hooks/useAsync.js'
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

  // Seeded hits stay on screen while later pages load, and if that fetch fails.
  const { data, error, status: fetchStatus } = useAsync(
    (signal) =>
      searchAllWithSuggestion({
        query: activeSearch.query,
        type: activeSearch.type,
        year: activeSearch.year,
        genre: activeSearch.genre,
        seedItems: activeSearch.results,
        totalPages: activeSearch.totalPages,
        signal,
      }),
    [activeKey],
  )

  const results = data?.items ?? seeded
  const status = data
    ? results.length
      ? 'success'
      : 'empty'
    : seeded.length
      ? 'success'
      : fetchStatus === 'error'
        ? 'error'
        : 'loading'

  const label = getSearchLabel(activeSearch)
  const count = results.length
  const summary =
    count > 0 ? `${pluralize(count, 'result')} for “${label}”` : `Results for “${label}”`

  return {
    status,
    error: seeded.length ? '' : error,
    results,
    suggestion: data?.suggestion ?? '',
    label,
    summary,
    acceptSuggestion(nextQuery) {
      setQueryOverride({ key: seedKey, query: nextQuery })
    },
  }
}
