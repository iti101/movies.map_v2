import { waitWithSignal } from './async.js'

/**
 * In-flight coalescing plus an optional LRU of resolved values.
 * Caller abort only ignores the result — the work still fills the cache.
 */
export function createCachedResource({ limit = Infinity } = {}) {
  const cache = new Map()
  const inflight = new Map()

  function remember(key, value) {
    if (cache.has(key)) cache.delete(key)
    cache.set(key, value)
    if (cache.size > limit) cache.delete(cache.keys().next().value)
    return value
  }

  return {
    has: (key) => cache.has(key),
    get: (key) => cache.get(key),
    set: remember,
    delete(key) {
      cache.delete(key)
    },
    load(key, factory, { signal, store = true } = {}) {
      if (store && cache.has(key)) {
        return waitWithSignal(Promise.resolve(cache.get(key)), signal)
      }

      let pending = inflight.get(key)
      if (!pending) {
        pending = Promise.resolve()
          .then(factory)
          .then((value) => {
            inflight.delete(key)
            return store ? remember(key, value) : value
          })
          .catch((error) => {
            inflight.delete(key)
            throw error
          })
        inflight.set(key, pending)
      }

      return waitWithSignal(pending, signal)
    },
  }
}
