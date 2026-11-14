import { tmdbGet } from './client.js'

const WATCH_REGION_KEY = 'watchRegion'

const OFFER_LABELS = {
  flatrate: 'Stream',
  free: 'Free',
  ads: 'Free with ads',
  rent: 'Rent',
  buy: 'Buy',
}

const FALLBACK_REGIONS = [
  'US',
  'GB',
  'NL',
  'DE',
  'FR',
  'CA',
  'AU',
  'BE',
  'ES',
  'IT',
  'SE',
  'BR',
  'MX',
  'JP',
  'IN',
]

const regionNames =
  typeof Intl !== 'undefined' && Intl.DisplayNames
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null

const PROVIDER_SITES = [
  [/netflix/i, (query) => `https://www.netflix.com/search?q=${query}`],
  [/disney/i, (query) => `https://www.disneyplus.com/search?q=${query}`],
  [/prime video|amazon/i, (query) => `https://www.primevideo.com/search?phrase=${query}`],
  [/hulu/i, (query) => `https://www.hulu.com/search?q=${query}`],
  [/max|hbo/i, (query) => `https://play.max.com/search?q=${query}`],
  [/apple tv/i, (query) => `https://tv.apple.com/search?term=${query}`],
  [/paramount/i, (query) => `https://www.paramountplus.com/search/?q=${query}`],
  [/peacock/i, (query) => `https://www.peacocktv.com/search?q=${query}`],
  [/crunchyroll/i, (query) => `https://www.crunchyroll.com/search?q=${query}`],
  [/youtube/i, (query) => `https://www.youtube.com/results?search_query=${query}`],
  [/google play/i, (query) => `https://play.google.com/store/search?q=${query}&c=movies`],
  [/mubi/i, (query) => `https://mubi.com/search/films?query=${query}`],
]

export function watchRegionName(code) {
  if (!code) return ''
  try {
    return regionNames?.of(code) || code
  } catch {
    return code
  }
}

function toRegionOptions(codes) {
  return [...new Set(codes.filter(Boolean))]
    .map((code) => ({ code, name: watchRegionName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
}

export function getFallbackWatchRegions() {
  return toRegionOptions(FALLBACK_REGIONS)
}

export function getSavedWatchRegion() {
  try {
    const saved = localStorage.getItem(WATCH_REGION_KEY)
    if (saved && /^[A-Z]{2}$/.test(saved)) return saved
  } catch {
    // Private browsing can block storage.
  }
  const region = navigator.language?.split('-')[1]
  return region && /^[A-Za-z]{2}$/.test(region) ? region.toUpperCase() : 'US'
}

export function saveWatchRegion(region) {
  try {
    localStorage.setItem(WATCH_REGION_KEY, region)
  } catch {
    // Ignore storage failures.
  }
}

export function normalizeWatchProviders(watchProviders) {
  const regions = {}

  for (const [code, offers] of Object.entries(watchProviders?.results ?? {})) {
    const providers = new Map()
    for (const [offerType, label] of Object.entries(OFFER_LABELS)) {
      for (const provider of offers?.[offerType] ?? []) {
        const known = providers.get(provider.provider_id)
        if (known) {
          known.offers.push(label)
          continue
        }
        providers.set(provider.provider_id, {
          id: provider.provider_id,
          name: provider.provider_name,
          logoPath: provider.logo_path,
          offers: [label],
        })
      }
    }
    regions[code.toUpperCase()] = {
      link: offers?.link || null,
      providers: [...providers.values()],
    }
  }

  return regions
}

let watchRegionsRequest

export function getWatchRegions({ signal } = {}) {
  if (!watchRegionsRequest) {
    watchRegionsRequest = tmdbGet('/watch/providers/regions')
      .then((data) => {
        const codes = (data.results ?? []).map((region) => region.iso_3166_1?.toUpperCase())
        return toRegionOptions(codes.length ? codes : FALLBACK_REGIONS)
      })
      .catch(() => getFallbackWatchRegions())
  }

  if (!signal) return watchRegionsRequest
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
    if (signal.aborted) {
      onAbort()
      return
    }
    signal.addEventListener('abort', onAbort, { once: true })
    watchRegionsRequest.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        if (signal.aborted) onAbort()
        else resolve(value)
      },
      (error) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      },
    )
  })
}

export function providerWatchUrl(name, title, fallback) {
  const query = encodeURIComponent(title || '')
  const match = PROVIDER_SITES.find(([pattern]) => pattern.test(name || ''))
  return match ? match[1](query) : fallback || null
}
