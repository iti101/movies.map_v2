const STORAGE_KEY = 'watchlists'
export const WATCHLISTS_CHANGED = 'watchlists-changed'

const DEFAULT_LIST = { id: 'watchlist', name: 'Watchlist', items: [] }

function readAll() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

function writeAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  window.dispatchEvent(new Event(WATCHLISTS_CHANGED))
}

function normalizeList(list) {
  return {
    id: String(list?.id ?? 'watchlist'),
    name: list?.name || 'Watchlist',
    items: Array.isArray(list?.items) ? list.items : [],
  }
}

function storedLists(userId) {
  if (userId == null) return null
  const lists = readAll()[String(userId)]
  return Array.isArray(lists) ? lists.map(normalizeList) : null
}

function listsFor(userId) {
  const lists = storedLists(userId)
  if (lists?.length) return lists
  return [{ ...DEFAULT_LIST, items: [] }]
}

function sameTitle(entry, item) {
  return entry.mediaType === item.mediaType && Number(entry.id) === Number(item.id)
}

export function getLists(userId) {
  if (userId == null) return []
  return storedLists(userId) ?? [{ ...DEFAULT_LIST, items: [] }]
}

export function isInWatchlist(userId, item) {
  if (userId == null || !item) return false
  return getLists(userId).some((list) => list.items.some((entry) => sameTitle(entry, item)))
}

function asWatchlistEntry(item) {
  return {
    id: item.id,
    mediaType: item.mediaType,
    title: item.title,
    imagePath: item.imagePath ?? item.posterPath ?? null,
    year:
      item.year ??
      (item.releaseDate || item.firstAirDate)?.slice(0, 4) ??
      null,
  }
}

export function addToList(userId, listId, item) {
  if (userId == null || !item || !listId) return null

  const all = readAll()
  const lists = listsFor(userId)
  const target = lists.find((list) => list.id === listId)
  if (!target) return null

  const exists = target.items.some((entry) => sameTitle(entry, item))
  const nextLists = lists.map((list) => {
    if (list.id !== listId) return list
    return {
      ...list,
      items: exists ? list.items : [...list.items, asWatchlistEntry(item)],
    }
  })

  all[String(userId)] = nextLists
  writeAll(all)
  return exists ? 'already' : 'added'
}

export function addToWatchlist(userId, item) {
  const lists = listsFor(userId)
  return addToList(userId, lists[0].id, item)
}

export function isInList(userId, listId, item) {
  if (userId == null || !item || !listId) return false
  const list = getLists(userId).find((entry) => entry.id === listId)
  return Boolean(list?.items.some((entry) => sameTitle(entry, item)))
}

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
