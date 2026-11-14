export const POSTER_BASE = 'https://image.tmdb.org/t/p/w185'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'

export function getImageUrl(path, size = 'w342') {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}
