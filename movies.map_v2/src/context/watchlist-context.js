import { createContext, useContext } from 'react'

export const WatchlistContext = createContext(null)

/** Lists + active list for the logged-in user. Must sit under WatchlistProvider. */
export function useWatchlist() {
  const value = useContext(WatchlistContext)
  if (!value) {
    throw new Error('useWatchlist must be used within WatchlistProvider')
  }
  return value
}
