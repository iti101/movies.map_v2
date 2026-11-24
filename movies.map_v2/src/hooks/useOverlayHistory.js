import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { mediaRef } from '../lib/media.js'

function currentState() {
  return window.history.state ?? {}
}

function closeFromHistory(key, reset) {
  if (currentState()[key]) window.history.back()
  else reset()
}

/**
 * Overlay open/close plus a history.pushState / popstate pair so Back works.
 * Results, detail, and watchlist each push; dismissOverlays pops the whole stack
 * so Home / section links cannot leave a phantom overlay for the next Back.
 */
export function useOverlayHistory() {
  const [resultsSearch, setResultsSearch] = useState(null)
  const [detail, setDetail] = useState(null)
  const [watchlistOpen, setWatchlistOpen] = useState(false)
  const depthRef = useRef(0)
  const ignoringPopRef = useRef(false)

  const pushOverlay = useCallback((state) => {
    window.history.pushState(state, '')
    depthRef.current += 1
  }, [])

  const openResults = useCallback(
    (search) => {
      setResultsSearch(search)
      pushOverlay({ results: true })
    },
    [pushOverlay],
  )

  const closeResults = useCallback(() => {
    closeFromHistory('results', () => setResultsSearch(null))
  }, [])

  const openDetail = useCallback(
    (item) => {
      if (!item?.id || !item.mediaType) return
      const next = mediaRef(item)
      setDetail(next)
      pushOverlay({ ...currentState(), detail: next })
    },
    [pushOverlay],
  )

  const closeDetail = useCallback(() => {
    closeFromHistory('detail', () => setDetail(null))
  }, [])

  const openWatchlist = useCallback(() => {
    setWatchlistOpen(true)
    if (!currentState().watchlist) {
      pushOverlay({ ...currentState(), watchlist: true })
    }
  }, [pushOverlay])

  const closeWatchlist = useCallback(() => {
    closeFromHistory('watchlist', () => setWatchlistOpen(false))
  }, [])

  const dismissOverlays = useCallback(() => {
    setResultsSearch(null)
    setDetail(null)
    setWatchlistOpen(false)
    const depth = depthRef.current
    if (depth <= 0) return
    ignoringPopRef.current = true
    depthRef.current = 0
    window.history.go(-depth)
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
      if (ignoringPopRef.current) {
        ignoringPopRef.current = false
        return
      }
      depthRef.current = Math.max(0, depthRef.current - 1)
      const state = window.history.state
      setDetail(state?.detail ?? null)
      setWatchlistOpen(Boolean(state?.watchlist))
      if (!state?.results) setResultsSearch(null)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return useMemo(
    () => ({
      resultsSearch,
      detail,
      watchlistOpen,
      openResults,
      closeResults,
      openDetail,
      closeDetail,
      openWatchlist,
      closeWatchlist,
      dismissOverlays,
      clearWatchlistHistory,
    }),
    [
      resultsSearch,
      detail,
      watchlistOpen,
      openResults,
      closeResults,
      openDetail,
      closeDetail,
      openWatchlist,
      closeWatchlist,
      dismissOverlays,
      clearWatchlistHistory,
    ],
  )
}
