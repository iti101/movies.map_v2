const IMAGE_BASE = 'https://image.tmdb.org/t/p'

const SRCSET = {
  w92: ['w92', 'w154', 'w185'],
  w185: ['w185', 'w342'],
  w342: ['w185', 'w342', 'w500'],
  w500: ['w342', 'w500', 'w780'],
}

export function getImageUrl(path, size = 'w342') {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

export function getImageSrcSet(path, size = 'w342') {
  if (!path) return undefined
  const widths = SRCSET[size]
  if (!widths) return undefined
  return widths
    .map((entry) => `${getImageUrl(path, entry)} ${entry.slice(1)}w`)
    .join(', ')
}
