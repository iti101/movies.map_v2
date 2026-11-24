import { yearFromDate } from '../lib/format.js'
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

function saveLists(userId, lists) {
  const all = readAll()
  all[String(userId)] = lists
  writeJson(STORAGE_KEY, all)
  window.dispatchEvent(new Event(WATCHLISTS_CHANGED))
  return lists
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
  return storedLists(userId) ?? defaultLists()
}

export function listContains(list, item) {
  return Boolean(list?.items.some((entry) => sameMedia(entry, item)))
}

export function getLists(userId) {
  if (userId == null) return []
  return listsFor(userId)
}

function asWatchlistEntry(item) {
  return {
    id: item.id,
    mediaType: item.mediaType,
    title: item.title,
    imagePath: item.imagePath ?? item.posterPath ?? null,
    year: item.year ?? yearFromDate(item.releaseDate || item.firstAirDate),
  }
}

export function addToList(userId, listId, item) {
  if (userId == null || !item || !listId) return null

  const lists = listsFor(userId)
  const target = lists.find((list) => list.id === listId)
  if (!target) return null

  const exists = listContains(target, item)
  saveLists(
    userId,
    lists.map((list) =>
      list.id !== listId
        ? list
        : {
            ...list,
            items: exists ? list.items : [...list.items, asWatchlistEntry(item)],
          },
    ),
  )
  return exists ? 'already' : 'added'
}

export function createList(userId, name) {
  const trimmed = String(name ?? '').trim()
  if (!trimmed || userId == null) return null

  const list = { id: crypto.randomUUID(), name: trimmed, items: [] }
  saveLists(userId, [...listsFor(userId), list])
  return list
}

export function deleteList(userId, listId) {
  if (userId == null) return []
  return saveLists(
    userId,
    listsFor(userId).filter((list) => list.id !== listId),
  )
}

export function removeFromList(userId, listId, item) {
  if (userId == null) return
  saveLists(
    userId,
    listsFor(userId).map((list) =>
      list.id !== listId
        ? list
        : {
            ...list,
            items: list.items.filter((entry) => !sameMedia(entry, item)),
          },
    ),
  )
}
