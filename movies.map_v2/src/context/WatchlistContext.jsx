import { useEffect, useMemo, useState } from 'react'
import {
  WATCHLISTS_CHANGED,
  createList as storeCreateList,
  deleteList as storeDeleteList,
  getLists,
  removeFromList,
} from '../API/watchlist.js'
import { WatchlistContext } from './watchlist-context.js'

/**
 * Holds the current user's lists and which one is selected.
 * Listens for `watchlists-changed` so Add on a detail page updates this overlay.
 */
export function WatchlistProvider({ userId, children }) {
  const [lists, setLists] = useState(() => getLists(userId))
  const [activeListId, setActiveListId] = useState(
    () => getLists(userId)[0]?.id ?? null,
  )

  useEffect(() => {
    function refresh() {
      const next = getLists(userId)
      setLists(next)
      setActiveListId((current) =>
        next.some((list) => list.id === current) ? current : (next[0]?.id ?? null),
      )
    }

    refresh()
    window.addEventListener(WATCHLISTS_CHANGED, refresh)
    return () => window.removeEventListener(WATCHLISTS_CHANGED, refresh)
  }, [userId])

  const activeList = lists.find((list) => list.id === activeListId) ?? null

  const value = useMemo(
    () => ({
      lists,
      activeList,
      activeListId,
      setActiveListId,
      removeItem(listId, item) {
        removeFromList(userId, listId, item)
      },
      deleteList(listId) {
        storeDeleteList(userId, listId)
      },
      createList(name) {
        const list = storeCreateList(userId, name)
        if (list) setActiveListId(list.id)
        return list
      },
    }),
    [lists, activeList, activeListId, userId],
  )

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>
}
