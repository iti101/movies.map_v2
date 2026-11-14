import { tmdbGet } from './client.js'
import { normalizeItem } from './normalize.js'

const TMDB_SEARCH = {
  all: '/search/multi',
  movie: '/search/movie',
  tv: '/search/tv',
  person: '/search/person',
}

const TMDB_DISCOVER = {
  movie: '/discover/movie',
  tv: '/discover/tv',
}

const TMDB_GENRE = {
  movie: '/genre/movie/list',
  tv: '/genre/tv/list',
}

const MAX_RESULT_PAGES = 10
const SEARCH_ERROR = 'Movie search failed. Check your API key and try again.'

function searchOptions(signal) {
  return { signal, errorMessage: SEARCH_ERROR }
}

export function isValidYear(value) {
  return /^\d{4}$/.test(value)
}

/** Heading text: the typed query, year, or genre name if that is all they searched with. */
export function getSearchLabel({ query, year, genre }) {
  return query?.trim() || year || genre?.name || ''
}

function normalizeTitle(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/^(the|a|an)\s+/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function levenshtein(a, b) {
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  const curr = new Array(b.length + 1)

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j]
  }

  return prev[b.length]
}

export function getDidYouMeanSuggestion(query, items) {
  const q = normalizeTitle(query)
  if (q.length < 3 || !items?.length) return null

  const titles = items.map((item) => item.title).filter(Boolean)
  if (titles.some((title) => normalizeTitle(title) === q)) return null

  const maxDist = Math.max(1, Math.round(q.length * 0.34))
  let bestTitle = null
  let bestDist = Infinity

  for (const title of titles.slice(0, 10)) {
    const n = normalizeTitle(title)
    if (!n || n.startsWith(`${q} `) || q.startsWith(`${n} `)) continue

    const dist = levenshtein(q, n)
    if (dist > 0 && dist <= maxDist && dist < bestDist) {
      bestTitle = title
      bestDist = dist
    }
  }

  return bestTitle
}

export async function getSearchSuggestion({ query, type, year, items, signal }) {
  const fromItems = getDidYouMeanSuggestion(query, items)
  if (fromItems || items?.length) return fromItems ?? null

  const trimmed = query?.trim() ?? ''
  if (trimmed.length < 5) return null

  const stub = trimmed.slice(0, Math.max(4, trimmed.length - 2))
  if (stub.length < 3 || stub.toLowerCase() === trimmed.toLowerCase()) return null

  try {
    const fallback = await searchTmdb({ query: stub, type, year, signal })
    return getDidYouMeanSuggestion(trimmed, fallback.items)
  } catch {
    return null
  }
}

/**
 * Extra local filters TMDB cannot always take as query params.
 * Genre after a text search, and year when type is “all” (multi search has no year field).
 */
export function applySearchFilters(items, { type, year, genre }) {
  let next = items
  if (genre) {
    next = next.filter((item) => item.genreIds.includes(genre.id))
  }
  if (year && type === 'all') {
    next = next.filter((item) => item.year === year)
  }
  return next
}

/** Text search. Year is sent only for movie/tv — not for “all” (multi) or people. */
export async function searchTmdb({ query, type, year, page = 1, signal } = {}) {
  const params = {
    query,
    include_adult: 'false',
    page,
  }
  if (year && type === 'movie') params.year = year
  if (year && type === 'tv') params.first_air_date_year = year

  const data = await tmdbGet(TMDB_SEARCH[type], params, searchOptions(signal))
  return {
    items: (data.results ?? []).map((item) =>
      normalizeItem(item, type === 'all' ? item.media_type : type),
    ),
    page: data.page ?? page,
    totalPages: data.total_pages ?? 1,
  }
}

function genreIds(value) {
  if (!value) return []
  const list = Array.isArray(value) ? value : [value]
  return list.map((entry) => entry?.id ?? entry).filter((id) => id != null)
}

/** Browse popular titles with optional year/genre/person in the TMDB URL (no search box text). */
async function discoverByMedia(
  mediaType,
  { year, genre, genres, excludeGenres, personId, page = 1, signal },
) {
  const params = {
    include_adult: 'false',
    page,
    sort_by: 'popularity.desc',
  }
  if (year && mediaType === 'movie') params.primary_release_year = year
  if (year && mediaType === 'tv') params.first_air_date_year = year

  const include = genreIds(genres?.length ? genres : genre)
  const exclude = genreIds(excludeGenres)
  // Pipe = OR for wants; comma = exclude any of these genres
  if (include.length) params.with_genres = include.join('|')
  if (exclude.length) params.without_genres = exclude.join(',')
  if (personId) params.with_people = String(personId)

  const data = await tmdbGet(TMDB_DISCOVER[mediaType], params, searchOptions(signal))
  return {
    items: (data.results ?? []).map((item) => normalizeItem(item, mediaType)),
    page: data.page ?? page,
    totalPages: data.total_pages ?? 1,
  }
}

/** Discover wrapper: people are unsupported; “all” fetches movie + TV in parallel. */
export async function discoverTmdb({
  type,
  year,
  genre,
  genres,
  excludeGenres,
  personId,
  page = 1,
  signal,
} = {}) {
  if (type === 'person') {
    return { items: [], page: 1, totalPages: 0 }
  }

  const options = { year, genre, genres, excludeGenres, personId, page, signal }

  if (type === 'all') {
    const [movies, shows] = await Promise.all([
      discoverByMedia('movie', options),
      discoverByMedia('tv', options),
    ])
    return {
      items: [...movies.items, ...shows.items],
      page,
      totalPages: Math.max(movies.totalPages, shows.totalPages),
    }
  }

  return discoverByMedia(type, options)
}

/** One TMDB page: search if there is a query, otherwise discover. */
export async function fetchTmdbPage({ query, type, year, genre, page = 1, signal } = {}) {
  const trimmed = query?.trim() ?? ''
  if (trimmed) {
    return searchTmdb({ query: trimmed, type, year, page, signal })
  }
  return discoverTmdb({ type, year, genre, page, signal })
}

/** Up to 10 pages for “See all”, then the same client-side year/genre filters. */
export async function searchTmdbAll({
  query,
  type,
  year,
  genre,
  maxPages = MAX_RESULT_PAGES,
  signal,
} = {}) {
  const first = await fetchTmdbPage({ query, type, year, genre, page: 1, signal })
  const pages = Math.min(first.totalPages, maxPages)

  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
      fetchTmdbPage({ query, type, year, genre, page: i + 2, signal }),
    ),
  )

  const items = [first, ...rest].flatMap((result) => result.items)
  return applySearchFilters(items, { type, year, genre })
}

/** Genre chips. Type “all” merges movie + TV lists (there is no combined TMDB genre endpoint). */
export async function loadGenres(type, { signal } = {}) {
  if (type === 'all') {
    const [movies, shows] = await Promise.all([
      loadGenres('movie', { signal }),
      loadGenres('tv', { signal }),
    ])
    const byId = new Map()
    for (const genre of [...movies, ...shows]) {
      if (genre?.id != null) byId.set(genre.id, genre)
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'en'))
  }

  const path = type === 'tv' ? TMDB_GENRE.tv : TMDB_GENRE.movie
  const data = await tmdbGet(path, {}, { signal, errorMessage: 'Could not load genres.' })
  return data.genres ?? []
}

export async function searchPeople(query, { signal } = {}) {
  const trimmed = String(query ?? '').trim()
  if (!trimmed) return []

  const data = await tmdbGet(
    TMDB_SEARCH.person,
    { query: trimmed, include_adult: 'false', page: 1 },
    searchOptions(signal),
  )
  return (data.results ?? []).slice(0, 6).map((person) => ({
    id: person.id,
    name: person.name,
    profilePath: person.profile_path ?? null,
  }))
}
