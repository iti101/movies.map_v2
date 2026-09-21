const TMDB_SEARCH = {
  all: 'https://api.themoviedb.org/3/search/multi',
  movie: 'https://api.themoviedb.org/3/search/movie',
  tv: 'https://api.themoviedb.org/3/search/tv',
  person: 'https://api.themoviedb.org/3/search/person',
}

const TMDB_DISCOVER = {
  movie: 'https://api.themoviedb.org/3/discover/movie',
  tv: 'https://api.themoviedb.org/3/discover/tv',
}

const TMDB_GENRE = {
  movie: 'https://api.themoviedb.org/3/genre/movie/list',
  tv: 'https://api.themoviedb.org/3/genre/tv/list',
}

export const POSTER_BASE = 'https://image.tmdb.org/t/p/w185'
const MAX_RESULT_PAGES = 10

function getApiKey() {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY
  if (!apiKey) {
    throw new Error('Missing TMDB API key. Add VITE_TMDB_API_KEY to .env.local and restart the dev server.')
  }
  return apiKey
}

function getYear(date) {
  return date?.slice(0, 4) ?? null
}

function normalizeItem(item, fallbackType) {
  const mediaType = item.media_type || fallbackType
  if (mediaType === 'person') {
    return {
      id: item.id,
      mediaType,
      title: item.name,
      year: null,
      imagePath: item.profile_path,
      genreIds: [],
    }
  }

  return {
    id: item.id,
    mediaType,
    title: item.title || item.name,
    year: getYear(item.release_date || item.first_air_date),
    imagePath: item.poster_path,
    genreIds: item.genre_ids ?? [],
  }
}

export function isValidYear(value) {
  return /^\d{4}$/.test(value)
}

export function getSearchLabel({ query, year }) {
  return query?.trim() || year || ''
}

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

async function fetchTmdbJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Movie search failed. Check your API key and try again.')
  }
  return response.json()
}

export async function searchTmdb({ query, type, year, page = 1 }) {
  const url = new URL(TMDB_SEARCH[type])
  url.searchParams.set('api_key', getApiKey())
  url.searchParams.set('query', query)
  url.searchParams.set('include_adult', 'false')
  url.searchParams.set('page', String(page))
  if (year && type === 'movie') url.searchParams.set('year', year)
  if (year && type === 'tv') url.searchParams.set('first_air_date_year', year)

  const data = await fetchTmdbJson(url)
  return {
    items: (data.results ?? []).map((item) =>
      normalizeItem(item, type === 'all' ? item.media_type : type),
    ),
    page: data.page ?? page,
    totalPages: data.total_pages ?? 1,
  }
}

async function discoverByMedia(mediaType, { year, genre, page = 1 }) {
  const url = new URL(TMDB_DISCOVER[mediaType])
  url.searchParams.set('api_key', getApiKey())
  url.searchParams.set('include_adult', 'false')
  url.searchParams.set('page', String(page))
  url.searchParams.set('sort_by', 'popularity.desc')
  if (year && mediaType === 'movie') url.searchParams.set('primary_release_year', year)
  if (year && mediaType === 'tv') url.searchParams.set('first_air_date_year', year)
  if (genre?.id) url.searchParams.set('with_genres', String(genre.id))

  const data = await fetchTmdbJson(url)
  return {
    items: (data.results ?? []).map((item) => normalizeItem(item, mediaType)),
    page: data.page ?? page,
    totalPages: data.total_pages ?? 1,
  }
}

export async function discoverTmdb({ type, year, genre, page = 1 }) {
  if (type === 'person') {
    return { items: [], page: 1, totalPages: 0 }
  }

  if (type === 'all') {
    const [movies, shows] = await Promise.all([
      discoverByMedia('movie', { year, genre, page }),
      discoverByMedia('tv', { year, genre, page }),
    ])
    return {
      items: [...movies.items, ...shows.items],
      page,
      totalPages: Math.max(movies.totalPages, shows.totalPages),
    }
  }

  return discoverByMedia(type, { year, genre, page })
}

export async function fetchTmdbPage({ query, type, year, genre, page = 1 }) {
  const trimmed = query?.trim() ?? ''
  if (trimmed) {
    return searchTmdb({ query: trimmed, type, year, page })
  }
  return discoverTmdb({ type, year, genre, page })
}

export async function searchTmdbAll({ query, type, year, genre, maxPages = MAX_RESULT_PAGES }) {
  const first = await fetchTmdbPage({ query, type, year, genre, page: 1 })
  const pages = Math.min(first.totalPages, maxPages)

  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
      fetchTmdbPage({ query, type, year, genre, page: i + 2 }),
    ),
  )

  const items = [first, ...rest].flatMap((r) => r.items)
  return applySearchFilters(items, { type, year, genre })
}

export async function loadGenres(type) {
  const endpoint = type === 'tv' ? TMDB_GENRE.tv : TMDB_GENRE.movie
  const url = new URL(endpoint)
  url.searchParams.set('api_key', getApiKey())
  const response = await fetch(url)
  if (!response.ok) throw new Error('Could not load genres.')
  const data = await response.json()
  return data.genres ?? []
}
