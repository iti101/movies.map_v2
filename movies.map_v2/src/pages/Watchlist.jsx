import { useState } from 'react'
import Button from '../components/Button.jsx'
import MovieCard from '../components/MovieCard.jsx'
import Select from '../components/Select.jsx'
import WatchlistModal from '../components/WatchlistModal.jsx'
import { useWatchlist } from '../context/watchlist-context.js'
import './Watchlist.css'

/** Logged-in overlay: switch lists, remove titles, or create/delete a list. */
function Watchlist({ onBack, onSelect, onFindTitle }) {
  const {
    lists,
    activeList,
    activeListId,
    setActiveListId,
    removeItem,
    deleteList,
  } = useWatchlist()
  const [createOpen, setCreateOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const count = activeList?.items.length ?? 0

  /** Empty lists delete immediately; lists with titles ask for a second click. */
  function handleDeleteList() {
    if (!activeList) return
    if (!confirmDelete && count > 0) {
      setConfirmDelete(true)
      return
    }
    deleteList(activeList.id)
    setConfirmDelete(false)
  }

  return (
    <article className="watchlist">
      <div className="watchlist__content">
        <Button className="watchlist__back" onClick={onBack}>
          Back
        </Button>

        <header className="watchlist__header">
          <div className="watchlist__heading">
            <p className="watchlist__kicker">Your collections</p>
            <h1 className="watchlist__title">Watchlist</h1>
          </div>

          <div className="watchlist__toolbar">
            <button
              type="button"
              className="watchlist__create"
              onClick={() => {
                setConfirmDelete(false)
                setCreateOpen(true)
              }}
            >
              Create new list
            </button>

            {lists.length > 1 && (
              <Select
                className="watchlist__select"
                ariaLabel="Choose a list"
                value={activeListId ?? ''}
                onChange={(nextId) => {
                  setConfirmDelete(false)
                  setActiveListId(nextId)
                }}
                options={lists.map((list) => ({
                  value: list.id,
                  label: `${list.name} · ${list.items.length}`,
                }))}
              />
            )}
          </div>
        </header>

        {lists.length === 0 && (
          <section className="watchlist__empty">
            <h2 className="watchlist__empty-title">No lists yet</h2>
            <p className="watchlist__empty-text">
              Create a list for movie nights, holidays, or any occasion, then add
              titles from a movie or show page.
            </p>
            <button
              type="button"
              className="watchlist__create"
              onClick={() => setCreateOpen(true)}
            >
              Create new list
            </button>
          </section>
        )}

        {activeList && (
          <section className="watchlist__list" aria-labelledby="watchlist-list-name">
            <div className="watchlist__list-header">
              <div>
                <h2 id="watchlist-list-name" className="watchlist__list-name">
                  {activeList.name}
                </h2>
                <p className="watchlist__count">
                  {count} {count === 1 ? 'title' : 'titles'}
                </p>
              </div>

              <button
                type="button"
                className={`watchlist__delete${confirmDelete ? ' watchlist__delete--confirm' : ''}`}
                onClick={handleDeleteList}
                onBlur={() => setConfirmDelete(false)}
              >
                {confirmDelete ? `Delete “${activeList.name}”?` : 'Delete list'}
              </button>
            </div>

            {count === 0 ? (
              <p className="watchlist__empty-text">
                This list is empty.{' '}
                <button type="button" className="watchlist__link" onClick={onFindTitle}>
                  Find a title
                </button>{' '}
                and tap Add to watchlist.
              </p>
            ) : (
              <ul className="watchlist__grid">
                {activeList.items.map((item) => (
                  <MovieCard
                    key={`${item.mediaType}-${item.id}`}
                    className="watchlist__tile"
                    item={item}
                    onSelect={onSelect}
                  >
                    <button
                      type="button"
                      className="watchlist__remove"
                      aria-label={`Remove ${item.title} from ${activeList.name}`}
                      onClick={() => removeItem(activeList.id, item)}
                    >
                      ×
                    </button>
                  </MovieCard>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <WatchlistModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </article>
  )
}

export default Watchlist
