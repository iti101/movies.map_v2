/**
 * Browser-only watchlists keyed by Novi user id.
 * In plain English: posters you save live in localStorage, not on the school server.
 */
const STORAGE_KEY = 'watchlists'
export const WATCHLISTS_CHANGED = 'watchlists-changed'

const DEFAULT_LIST = { id: 'watchlist', name: 'Watchlist', items: [] }

/** `{ [userId]: List[] }` map, or `{}` if storage is empty/corrupt. */
function readAll() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

/** Save and ping the same tab (`watchlists-changed`) so the overlay refreshes. */
function writeAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  window.dispatchEvent(new Event(WATCHLISTS_CHANGED))
}

/** Fill in missing id/name/items so old storage still renders. */
function normalizeList(list) {
  return {
    id: String(list?.id ?? 'watchlist'),
    name: list?.name || 'Watchlist',
    items: Array.isArray(list?.items) ? list.items : [],
  }
}

/** Stored lists for this user, or null if they have never saved anything. */
function storedLists(userId) {
  if (userId == null) return null
  const lists = readAll()[String(userId)]
  return Array.isArray(lists) ? lists.map(normalizeList) : null
}

/** Stored lists, or a fresh default Watchlist when adding to an empty account. */
function listsFor(userId) {
  const lists = storedLists(userId)
  if (lists?.length) return lists
  return [{ ...DEFAULT_LIST, items: [] }]
}

/** Same TMDB title: matching media type and numeric id. */
function sameTitle(entry, item) {
  return entry.mediaType === item.mediaType && Number(entry.id) === Number(item.id)
}

/** Lists to show in the overlay. Empty array if the user deleted every list. */
export function getLists(userId) {
  if (userId == null) return []
  return storedLists(userId) ?? [{ ...DEFAULT_LIST, items: [] }]
}

/** True if this movie/show is on any of the user’s lists. */
export function isInWatchlist(userId, item) {
  if (userId == null || !item) return false
  return getLists(userId).some((list) => list.items.some((entry) => sameTitle(entry, item)))
}

/** Append to the *first* list only. Returns `'added'` or `'already'`. */
export function addToWatchlist(userId, item) {
  const all = readAll()
  const lists = listsFor(userId)
  const list = { ...lists[0], items: [...lists[0].items] }
  const exists = list.items.some((entry) => sameTitle(entry, item))

  if (!exists) {
    list.items.push({
      id: item.id,
      mediaType: item.mediaType,
      title: item.title,
      imagePath: item.imagePath ?? null,
      year: item.year ?? null,
    })
  }

  all[String(userId)] = [list, ...lists.slice(1)]
  writeAll(all)
  return exists ? 'already' : 'added'
}

/** New named list (UUID id). Blank name → null. */
export function createList(userId, name) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed || userId == null) return null

  const all = readAll()
  const lists = storedLists(userId) ?? [{ ...DEFAULT_LIST, items: [] }]
  const list = { id: crypto.randomUUID(), name: trimmed, items: [] }
  all[String(userId)] = [...lists, list]
  writeAll(all)
  return list
}

/** Remove a list, including the original default Watchlist. */
export function deleteList(userId, listId) {
  if (userId == null) return []
  const all = readAll()
  const lists = (storedLists(userId) ?? [{ ...DEFAULT_LIST, items: [] }]).filter(
    (list) => list.id !== listId,
  )
  all[String(userId)] = lists
  writeAll(all)
  return lists
}

/** Drop one title from one list. */
export function removeFromList(userId, listId, item) {
  if (userId == null) return
  const all = readAll()
  const lists = storedLists(userId) ?? listsFor(userId)
  all[String(userId)] = lists.map((list) => {
    if (list.id !== listId) return list
    return {
      ...list,
      items: list.items.filter((entry) => !sameTitle(entry, item)),
    }
  })
  writeAll(all)
}
