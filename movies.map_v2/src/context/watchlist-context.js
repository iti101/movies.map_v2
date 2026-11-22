import { createRequiredContext } from '../lib/context.js'

export const [WatchlistContext, useWatchlist] = createRequiredContext(
  'useWatchlist',
  'WatchlistProvider',
)
