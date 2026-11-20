import { createCachedResource } from '../../lib/cache.js'

const API_BASE = 'https://api.themoviedb.org/3'
const resources = createCachedResource({ limit: 80 })

/** Vite inlines VITE_* at startup — restart the dev server after editing .env.local. */
export function getApiKey() {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY
  if (!apiKey) {
    throw new Error(
      'Missing TMDB API key. Add VITE_TMDB_API_KEY to .env.local and restart the dev server.',
    )
  }
  return apiKey
}

export function tmdbUrl(path, params = {}) {
  const url = path.startsWith('http') ? new URL(path) : new URL(`${API_BASE}${path}`)
  url.searchParams.set('api_key', getApiKey())
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') url.searchParams.set(key, String(value))
  }
  return url
}

/**
 * Shared TMDB GET with an LRU cache and in-flight coalescing.
 * Caller abort only ignores the result — the network request still fills the cache.
 */
export async function tmdbGet(path, params = {}, options = {}) {
  const {
    signal,
    errorMessage = 'Could not load this page. Try again.',
    cache: useCache = true,
  } = options

  const url = tmdbUrl(path, params)

  return resources.load(
    url.toString(),
    () =>
      fetch(url).then((response) => {
        if (!response.ok) throw new Error(errorMessage)
        return response.json()
      }),
    { signal, store: useCache },
  )
}
