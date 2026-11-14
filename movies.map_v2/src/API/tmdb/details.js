import { tmdbGet } from './client.js'
import { normalizeItem } from './normalize.js'
import { normalizeWatchProviders } from './watch.js'

const CAST_LIMIT = 12
const DIRECTOR_LIMIT = 6
const RELATED_LIMIT = 8
const SIMILAR_ROW_LIMIT = 12
const KNOWN_FOR_LIMIT = 10

function clipUrl(video) {
  if (!video?.key) return null
  if (video.site === 'YouTube') return `https://www.youtube.com/watch?v=${video.key}`
  if (video.site === 'Vimeo') return `https://vimeo.com/${video.key}`
  return null
}

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

function score(data) {
  return {
    rating: data.vote_average ? Math.round(data.vote_average * 10) / 10 : null,
    voteCount: data.vote_count || 0,
  }
}

export async function getMovieDetails(id, { signal } = {}) {
  const data = await tmdbGet(
    `/movie/${id}`,
    {
      append_to_response: 'credits,videos,watch/providers,recommendations,similar',
      include_video_language: 'en-US,en,null',
    },
    { signal },
  )

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

export async function getTvDetails(id, { signal } = {}) {
  const data = await tmdbGet(
    `/tv/${id}`,
    {
      append_to_response: 'aggregate_credits,credits,videos,watch/providers,recommendations,similar',
      include_video_language: 'en-US,en,null',
    },
    { signal },
  )
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

export async function getTvSeason(showId, seasonNumber, { signal } = {}) {
  const data = await tmdbGet(`/tv/${showId}/season/${seasonNumber}`, {}, { signal })

  return (data.episodes ?? []).map((episode) => ({
    id: episode.id,
    number: episode.episode_number,
    name: episode.name || `Episode ${episode.episode_number}`,
    airDate: episode.air_date || null,
    runtime: episode.runtime || null,
    overview: episode.overview || null,
  }))
}

export async function getPersonDetails(id, { signal } = {}) {
  const data = await tmdbGet(`/person/${id}`, { append_to_response: 'combined_credits' }, { signal })
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

export const DETAIL_LOADERS = {
  movie: getMovieDetails,
  tv: getTvDetails,
  person: getPersonDetails,
}
