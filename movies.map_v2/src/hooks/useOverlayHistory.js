import { useCallback, useEffect, useState } from 'react'

function currentState() {
  return window.history.state ?? {}
}

function closeFlag(flag, fallback) {
  if (currentState()[flag]) window.history.back()
  else fallback()
}

/**
 * Overlay open/close plus a history.pushState / popstate pair so Back works.
 * Results replace history state; detail and watchlist stack on top of it.
 */
export function useOverlayHistory() {
  const [resultsSearch, setResultsSearch] = useState(null)
  const [detail, setDetail] = useState(null)
  const [watchlistOpen, setWatchlistOpen] = useState(false)

  const openResults = useCallback((search) => {
    setResultsSearch(search)
    window.history.pushState({ results: true }, '')
  }, [])

  const closeResults = useCallback(() => {
    closeFlag('results', () => setResultsSearch(null))
  }, [])

  const openDetail = useCallback((item) => {
    if (!item?.id || !item.mediaType) return
    const next = { mediaType: item.mediaType, id: item.id }
    setDetail(next)
    window.history.pushState({ ...currentState(), detail: next }, '')
  }, [])

  const closeDetail = useCallback(() => {
    closeFlag('detail', () => setDetail(null))
  }, [])

  const openWatchlist = useCallback(() => {
    setWatchlistOpen(true)
    if (!currentState().watchlist) {
      window.history.pushState({ ...currentState(), watchlist: true }, '')
    }
  }, [])

  const closeWatchlist = useCallback(() => {
    closeFlag('watchlist', () => setWatchlistOpen(false))
  }, [])

  const dismissOverlays = useCallback(() => {
    setResultsSearch(null)
    setDetail(null)
    setWatchlistOpen(false)
    const state = currentState()
    if (state.results || state.detail || state.watchlist) {
      window.history.replaceState({}, '')
    }
  }, [])

  const clearWatchlistHistory = useCallback(() => {
    setWatchlistOpen(false)
    if (!currentState().watchlist) return
    const next = { ...currentState() }
    delete next.watchlist
    window.history.replaceState(next, '')
  }, [])

  useEffect(() => {
    function onPopState() {
      const state = window.history.state
      setDetail(state?.detail ?? null)
      setWatchlistOpen(Boolean(state?.watchlist))
      if (!state?.results) setResultsSearch(null)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return {
    resultsSearch,
    detail,
    watchlistOpen,
    overlayOpen: Boolean(resultsSearch || detail || watchlistOpen),
    openResults,
    closeResults,
    openDetail,
    closeDetail,
    openWatchlist,
    closeWatchlist,
    dismissOverlays,
    clearWatchlistHistory,
  }
}
