import { yearFromDate } from '../../lib/format.js'

/** Flatten TMDB’s movie/TV/person shapes into the fields MovieCard expects. */
export function normalizeItem(item, fallbackType) {
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
    year: yearFromDate(item.release_date || item.first_air_date),
    imagePath: item.poster_path,
    genreIds: item.genre_ids ?? [],
  }
}
