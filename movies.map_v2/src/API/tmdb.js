/**
 * Talks to The Movie Database (TMDB).
 *
 * In plain English: if the user typed a title we *search*; if they only picked
 * a year/genre we *browse* popular titles (discover). Some filters go in the
 * URL; others are applied here after the JSON comes back. See docs/search.md.
 */
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

/** Unused leftover. Live posters go through `getImageUrl` (default `w342`). */
export const POSTER_BASE = 'https://image.tmdb.org/t/p/w185'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'

export const MEDIA_LABELS = {
  movie: 'Movie',
  tv: 'TV',
  person: 'Person',
}

/** TMDB image path → full URL. Missing path → null (callers show a placeholder). */
export function getImageUrl(path, size = 'w342') {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

const MAX_RESULT_PAGES = 10

/** Vite inlines VITE_* at startup — restart the dev server after editing .env.local. */
function getApiKey() {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY
  if (!apiKey) {
    throw new Error('Missing TMDB API key. Add VITE_TMDB_API_KEY to .env.local and restart the dev server.')
  }
  return apiKey
}

/** First four characters of a TMDB date (`2010-07-16` → `2010`). */
function getYear(date) {
  return date?.slice(0, 4) ?? null
}

/** Flatten TMDB’s movie/TV/person shapes into the fields MovieCard expects. */
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

/** Four-digit year only (`1999` yes, `99` / `19990` no). */
export function isValidYear(value) {
  return /^\d{4}$/.test(value)
}

/** Heading text: the typed query, or the year if that is all they searched with. */
export function getSearchLabel({ query, year }) {
  return query?.trim() || year || ''
}

/** Compare titles: ignore case, accents, “the ”, and punctuation. */
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

/** Edit distance between two strings (insert / delete / replace). */
function levenshtein(a, b) {
  if (a === b) return 0
  if (!a) return b.length
  if (!b) return a.length

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  const curr = new Array(b.length + 1)

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
  }

  return prev[b.length]
}

/** Closest result title for a likely typo, or null if the query already matches. */
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

/** Did-you-mean from current hits, or a shortened-query retry when the list is empty. */
export async function getSearchSuggestion({ query, type, year, items }) {
  const fromItems = getDidYouMeanSuggestion(query, items)
  if (fromItems || items?.length) return fromItems ?? null

  const trimmed = query?.trim() ?? ''
  if (trimmed.length < 5) return null

  const stub = trimmed.slice(0, Math.max(4, trimmed.length - 2))
  if (stub.length < 3 || stub.toLowerCase() === trimmed.toLowerCase()) return null

  try {
    const fallback = await searchTmdb({ query: stub, type, year })
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

/** Shared fetch: non-OK HTTP becomes the user-facing “Movie search failed…” error. */
async function fetchTmdbJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Movie search failed. Check your API key and try again.')
  }
  return response.json()
}

/** Text search. Year is sent only for movie/tv — not for “all” (multi) or people. */
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

/** Genre objects or raw ids → numeric ids for TMDB discover params. */
function genreIds(value) {
  if (!value) return []
  const list = Array.isArray(value) ? value : [value]
  return list.map((entry) => entry?.id ?? entry).filter((id) => id != null)
}

/** Browse popular titles with optional year/genre/person in the TMDB URL (no search box text). */
async function discoverByMedia(
  mediaType,
  { year, genre, genres, excludeGenres, personId, page = 1 },
) {
  const url = new URL(TMDB_DISCOVER[mediaType])
  url.searchParams.set('api_key', getApiKey())
  url.searchParams.set('include_adult', 'false')
  url.searchParams.set('page', String(page))
  url.searchParams.set('sort_by', 'popularity.desc')
  if (year && mediaType === 'movie') url.searchParams.set('primary_release_year', year)
  if (year && mediaType === 'tv') url.searchParams.set('first_air_date_year', year)

  const include = genreIds(genres?.length ? genres : genre)
  const exclude = genreIds(excludeGenres)
  // Pipe = OR for wants; comma = exclude any of these genres
  if (include.length) url.searchParams.set('with_genres', include.join('|'))
  if (exclude.length) url.searchParams.set('without_genres', exclude.join(','))
  if (personId) url.searchParams.set('with_people', String(personId))

  const data = await fetchTmdbJson(url)
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
}) {
  if (type === 'person') {
    return { items: [], page: 1, totalPages: 0 }
  }

  const options = { year, genre, genres, excludeGenres, personId, page }

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
export async function fetchTmdbPage({ query, type, year, genre, page = 1 }) {
  const trimmed = query?.trim() ?? ''
  if (trimmed) {
    return searchTmdb({ query: trimmed, type, year, page })
  }
  return discoverTmdb({ type, year, genre, page })
}

/** Up to 10 pages for “See all”, then the same client-side year/genre filters. */
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

/** Genre chips. Type “all” merges movie + TV lists by id (no combined TMDB endpoint). */
export async function loadGenres(type) {
  if (type === 'all') {
    const [movies, shows] = await Promise.all([loadGenres('movie'), loadGenres('tv')])
    const byId = new Map()
    for (const genre of [...movies, ...shows]) {
      if (genre?.id != null) byId.set(genre.id, genre)
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'en'))
  }

  const endpoint = type === 'tv' ? TMDB_GENRE.tv : TMDB_GENRE.movie
  const url = new URL(endpoint)
  url.searchParams.set('api_key', getApiKey())
  const response = await fetch(url)
  if (!response.ok) throw new Error('Could not load genres.')
  const data = await response.json()
  return data.genres ?? []
}

/** First page of people search, capped at 6 — used by the Randomizer “Who” step. */
export async function searchPeople(query) {
  const trimmed = String(query ?? '').trim()
  if (!trimmed) return []

  const url = new URL(TMDB_SEARCH.person)
  url.searchParams.set('api_key', getApiKey())
  url.searchParams.set('query', trimmed)
  url.searchParams.set('include_adult', 'false')
  url.searchParams.set('page', '1')

  const data = await fetchTmdbJson(url)
  return (data.results ?? []).slice(0, 6).map((person) => ({
    id: person.id,
    name: person.name,
    profilePath: person.profile_path ?? null,
  }))
}

const CAST_LIMIT = 12
const DIRECTOR_LIMIT = 6
const RELATED_LIMIT = 8
const SIMILAR_ROW_LIMIT = 12
const KNOWN_FOR_LIMIT = 10
const WATCH_REGION_KEY = 'watchRegion'

const OFFER_LABELS = {
  flatrate: 'Stream',
  free: 'Free',
  ads: 'Free with ads',
  rent: 'Rent',
  buy: 'Buy',
}

const FALLBACK_REGIONS = ['US', 'GB', 'NL', 'DE', 'FR', 'CA', 'AU', 'BE', 'ES', 'IT', 'SE', 'BR', 'MX', 'JP', 'IN']

const regionNames =
  typeof Intl !== 'undefined' && Intl.DisplayNames
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null

/** TMDB GET `/3{path}` with the v3 key. Non-OK → “Could not load this page…”. */
async function tmdbGet(path, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3${path}`)
  url.searchParams.set('api_key', getApiKey())
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') url.searchParams.set(key, String(value))
  }
  const response = await fetch(url)
  if (!response.ok) throw new Error('Could not load this page. Try again.')
  return response.json()
}

/** YouTube/Vimeo watch URL, or null for other TMDB video sites. */
function clipUrl(video) {
  if (!video?.key) return null
  if (video.site === 'YouTube') return `https://www.youtube.com/watch?v=${video.key}`
  if (video.site === 'Vimeo') return `https://vimeo.com/${video.key}`
  return null
}

/** Prefer an official YouTube trailer; otherwise teaser or first playable clip. */
function trailerUrl(videos) {
  const clips = (videos?.results ?? []).filter((video) => clipUrl(video))
  const trailer =
    clips.find((video) => video.site === 'YouTube' && video.type === 'Trailer' && video.official) ||
    clips.find((video) => video.type === 'Trailer' && video.official) ||
    clips.find((video) => video.type === 'Trailer') ||
    clips.find((video) => video.type === 'Teaser') ||
    clips[0]
  return clipUrl(trailer)
}

/** First CAST_LIMIT names, with character (or TV role list) when TMDB has it. */
function mapCast(credits) {
  return (credits?.cast ?? []).slice(0, CAST_LIMIT).map((member) => ({
    id: member.id,
    name: member.name,
    character:
      member.character ||
      (member.roles ?? []).map((role) => role.character).filter(Boolean).join(', ') ||
      null,
    profilePath: member.profile_path,
  }))
}

/** Recommendations first, then similar, skipping the current title. */
function mapRelated(data, mediaType, excludeId, limit = RELATED_LIMIT) {
  const seen = new Set([Number(excludeId)])
  const items = []

  for (const source of [data.recommendations?.results, data.similar?.results]) {
    for (const raw of source ?? []) {
      if (!raw?.id || seen.has(raw.id)) continue
      seen.add(raw.id)
      items.push(normalizeItem(raw, mediaType))
      if (items.length === limit) return items
    }
  }

  return items
}

/** TV directors from aggregate_credits, falling back to credits.crew. */
function mapDirectors(data) {
  const seen = new Set()
  const people = []

  function add(person) {
    if (!person?.id || seen.has(person.id)) return
    seen.add(person.id)
    people.push({
      id: person.id,
      name: person.name,
      character: 'Director',
      profilePath: person.profile_path,
    })
  }

  for (const person of data.aggregate_credits?.crew ?? []) {
    if ((person.jobs ?? []).some((job) => job.job === 'Director')) add(person)
  }
  if (!people.length) {
    for (const person of data.credits?.crew ?? []) {
      if (person.job === 'Director') add(person)
    }
  }

  return people.slice(0, DIRECTOR_LIMIT)
}

/** English country name for an ISO region code (`US` → `United States`). */
export function watchRegionName(code) {
  if (!code) return ''
  try {
    return regionNames?.of(code) || code
  } catch {
    return code
  }
}

/** `{ code, name }` options, unique and sorted for the region <select>. */
function toRegionOptions(codes) {
  return [...new Set(codes.filter(Boolean))]
    .map((code) => ({ code, name: watchRegionName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
}

/** Offline region list when TMDB’s watch-provider regions call fails. */
export function getFallbackWatchRegions() {
  return toRegionOptions(FALLBACK_REGIONS)
}

/** Last “Where to watch” country, else the browser language region, else US. */
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

/** Remember the watch-provider country (`localStorage.watchRegion`). */
export function saveWatchRegion(region) {
  try {
    localStorage.setItem(WATCH_REGION_KEY, region)
  } catch {
    // Ignore storage failures.
  }
}

/** Group a country’s providers and stack Stream/Free/Rent/Buy labels. */
function normalizeWatchProviders(watchProviders) {
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

/** Cached TMDB watch-provider countries; falls back to `FALLBACK_REGIONS`. */
export function getWatchRegions() {
  if (!watchRegionsRequest) {
    watchRegionsRequest = tmdbGet('/watch/providers/regions')
      .then((data) => {
        const codes = (data.results ?? []).map((region) => region.iso_3166_1?.toUpperCase())
        return toRegionOptions(codes.length ? codes : FALLBACK_REGIONS)
      })
      .catch(() => getFallbackWatchRegions())
  }
  return watchRegionsRequest
}

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

/** Search URL on a known streamer, or TMDB’s country `link` if the name is unknown. */
export function providerWatchUrl(name, title, fallback) {
  const query = encodeURIComponent(title || '')
  const match = PROVIDER_SITES.find(([pattern]) => pattern.test(name || ''))
  return match ? match[1](query) : fallback || null
}

/** TMDB vote_average rounded to one decimal, plus vote count. */
function score(data) {
  return {
    rating: data.vote_average ? Math.round(data.vote_average * 10) / 10 : null,
    voteCount: data.vote_count || 0,
  }
}

/** One-shot movie page: credits, trailer, watch providers, similar. */
export async function getMovieDetails(id) {
  const data = await tmdbGet(`/movie/${id}`, {
    append_to_response: 'credits,videos,watch/providers,recommendations,similar',
    include_video_language: 'en-US,en,null',
  })

  return {
    id: data.id,
    mediaType: 'movie',
    title: data.title || 'Untitled',
    tagline: data.tagline || null,
    overview: data.overview || '',
    posterPath: data.poster_path,
    backdropPath: data.backdrop_path,
    releaseDate: data.release_date || null,
    runtime: data.runtime || null,
    genres: (data.genres ?? []).map((genre) => genre.name),
    directors: (data.credits?.crew ?? [])
      .filter((member) => member.job === 'Director')
      .map((member) => member.name),
    cast: mapCast(data.credits),
    trailerUrl: trailerUrl(data.videos),
    watch: normalizeWatchProviders(data['watch/providers']),
    similar: mapRelated(data, 'movie', data.id),
    ...score(data),
  }
}

/** One-shot TV page: aggregate cast, directors, seasons, watch providers, similar. */
export async function getTvDetails(id) {
  const data = await tmdbGet(`/tv/${id}`, {
    append_to_response: 'aggregate_credits,credits,videos,watch/providers,recommendations,similar',
    include_video_language: 'en-US,en,null',
  })
  const credits = data.aggregate_credits?.cast?.length ? data.aggregate_credits : data.credits

  return {
    id: data.id,
    mediaType: 'tv',
    title: data.name || 'Untitled',
    overview: data.overview || '',
    posterPath: data.poster_path,
    backdropPath: data.backdrop_path,
    firstAirDate: data.first_air_date || null,
    genres: (data.genres ?? []).map((genre) => genre.name),
    createdBy: (data.created_by ?? []).map((person) => person.name),
    seasons: (data.seasons ?? [])
      .filter((season) => season.episode_count > 0)
      .map((season) => ({
        number: season.season_number,
        name: season.name,
        episodeCount: season.episode_count,
      })),
    directors: mapDirectors(data),
    cast: mapCast(credits),
    trailerUrl: trailerUrl(data.videos),
    watch: normalizeWatchProviders(data['watch/providers']),
    similar: mapRelated(data, 'tv', data.id, SIMILAR_ROW_LIMIT),
    ...score(data),
  }
}

/** Episode list for one season (name, air date, runtime, overview). */
export async function getTvSeason(showId, seasonNumber) {
  const data = await tmdbGet(`/tv/${showId}/season/${seasonNumber}`)

  return (data.episodes ?? []).map((episode) => ({
    id: episode.id,
    number: episode.episode_number,
    name: episode.name || `Episode ${episode.episode_number}`,
    airDate: episode.air_date || null,
    runtime: episode.runtime || null,
    overview: episode.overview || null,
  }))
}

/** Person page plus popular movie/TV cast credits (`knownFor`). */
export async function getPersonDetails(id) {
  const data = await tmdbGet(`/person/${id}`, { append_to_response: 'combined_credits' })
  const seen = new Set()
  const knownFor = []

  for (const credit of data.combined_credits?.cast ?? []) {
    const mediaType = credit.media_type
    if (mediaType !== 'movie' && mediaType !== 'tv') continue
    if (mediaType === 'tv' && (credit.episode_count ?? 0) < 4) continue
    const key = `${mediaType}-${credit.id}`
    if (!credit.id || seen.has(key)) continue
    seen.add(key)
    knownFor.push({
      ...normalizeItem(credit, mediaType),
      popularity: credit.popularity ?? 0,
    })
  }

  knownFor.sort((a, b) => b.popularity - a.popularity)

  return {
    id: data.id,
    mediaType: 'person',
    name: data.name || 'Unknown',
    biography: data.biography || '',
    profilePath: data.profile_path,
    birthday: data.birthday || null,
    deathday: data.deathday || null,
    placeOfBirth: data.place_of_birth || null,
    knownFor: knownFor.slice(0, KNOWN_FOR_LIMIT),
  }
}
