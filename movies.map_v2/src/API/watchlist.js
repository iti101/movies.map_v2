import { sameMedia } from '../lib/media.js'
import { readJson, writeJson } from '../lib/storage.js'

const STORAGE_KEY = 'watchlists'
export const WATCHLISTS_CHANGED = 'watchlists-changed'

const DEFAULT_LIST = { id: 'watchlist', name: 'Watchlist', items: [] }

function defaultLists() {
  return [{ ...DEFAULT_LIST, items: [] }]
}

function readAll() {
  const data = readJson(STORAGE_KEY, {})
  return data && typeof data === 'object' ? data : {}
}

function writeAll(data) {
  writeJson(STORAGE_KEY, data)
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
  return defaultLists()
}

export function listContains(list, item) {
  return Boolean(list?.items.some((entry) => sameMedia(entry, item)))
}

export function getLists(userId) {
  if (userId == null) return []
  return storedLists(userId) ?? defaultLists()
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

  const exists = listContains(target, item)
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

export function createList(userId, name) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed || userId == null) return null

  const all = readAll()
  const lists = storedLists(userId) ?? defaultLists()
  const list = { id: crypto.randomUUID(), name: trimmed, items: [] }
  all[String(userId)] = [...lists, list]
  writeAll(all)
  return list
}

export function deleteList(userId, listId) {
  if (userId == null) return []
  const all = readAll()
  const lists = (storedLists(userId) ?? defaultLists()).filter(
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
      items: list.items.filter((entry) => !sameMedia(entry, item)),
    }
  })
  writeAll(all)
}
