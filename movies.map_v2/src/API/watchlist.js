const STORAGE_KEY = 'watchlists'

function readAll() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

function listsFor(userId) {
  const lists = readAll()[String(userId)]
  if (Array.isArray(lists) && lists.length) return lists
  return [{ id: 'watchlist', name: 'Watchlist', items: [] }]
}

function sameTitle(entry, item) {
  return entry.mediaType === item.mediaType && Number(entry.id) === Number(item.id)
}

export function isInWatchlist(userId, item) {
  if (userId == null) return false
  return listsFor(userId).some((list) => (list.items ?? []).some((entry) => sameTitle(entry, item)))
}

export function addToWatchlist(userId, item) {
  const all = readAll()
  const lists = listsFor(userId)
  const list = { ...lists[0], items: [...(lists[0].items ?? [])] }
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  return exists ? 'already' : 'added'
}
