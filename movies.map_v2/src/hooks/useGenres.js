import { loadGenres } from '../API/tmdb.js'
import { useAsync } from './useAsync.js'

export function useGenres(type) {
  const enabled = type !== 'person'
  const { data } = useAsync(
    (signal) => (enabled ? loadGenres(type, { signal }) : Promise.resolve([])),
    [type, enabled],
  )
  return data ?? []
}
