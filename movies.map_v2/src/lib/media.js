export const MEDIA_LABELS = {
  movie: 'Movie',
  tv: 'TV',
  person: 'Person',
}

export function mediaKey(item) {
  return `${item.mediaType}-${item.id}`
}

export function sameMedia(a, b) {
  return Boolean(
    a &&
      b &&
      a.mediaType === b.mediaType &&
      Number(a.id) === Number(b.id),
  )
}

export const SEARCH_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'TV' },
  { id: 'person', label: 'People' },
]

export const RANDOMIZER_TYPES = [
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'TV' },
  { id: 'all', label: 'All' },
]
