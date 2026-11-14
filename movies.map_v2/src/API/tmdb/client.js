const API_BASE = 'https://api.themoviedb.org/3'
const CACHE_LIMIT = 80

const cache = new Map()
const inflight = new Map()

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

function remember(key, value) {
  if (cache.has(key)) cache.delete(key)
  cache.set(key, value)
  if (cache.size > CACHE_LIMIT) {
    cache.delete(cache.keys().next().value)
  }
  return value
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
  const key = url.toString()

  if (useCache && cache.has(key)) return cache.get(key)

  let pending = inflight.get(key)
  if (!pending) {
    pending = fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error(errorMessage)
        return response.json()
      })
      .then((data) => {
        inflight.delete(key)
        return useCache ? remember(key, data) : data
      })
      .catch((error) => {
        inflight.delete(key)
        throw error
      })
    inflight.set(key, pending)
  }

  return waitWithSignal(pending, signal)
}

export function isAbortError(error) {
  return error?.name === 'AbortError'
}

function waitWithSignal(pending, signal) {
  if (!signal) return pending
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))

  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
    signal.addEventListener('abort', onAbort, { once: true })
    pending.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        if (signal.aborted) reject(new DOMException('Aborted', 'AbortError'))
        else resolve(value)
      },
      (error) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      },
    )
  })
}
