import { createContext, useContext } from 'react'

export const WatchlistContext = createContext(null)

export function useWatchlist() {
  const value = useContext(WatchlistContext)
  if (!value) {
    throw new Error('useWatchlist must be used within WatchlistProvider')
  }
  return value
}
