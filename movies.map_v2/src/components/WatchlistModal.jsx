import { useId, useState } from 'react'
import { useWatchlist } from '../context/watchlist-context.js'
import Modal from './Modal.jsx'

function WatchlistModal({ isOpen, onClose, item = null, onPicked }) {
  const titleId = useId()
  const { lists, createList, addItem } = useWatchlist()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(!item)

  function close() {
    setName('')
    setError('')
    setCreating(!item)
    onClose()
  }

  function handleCreate(event) {
    event.preventDefault()
    const list = createList(name)
    if (!list) {
      setError('Enter a name for this list.')
      return
    }
    if (item) {
      const result = addItem(list.id, item)
      onPicked?.(list, result)
    }
    close()
  }

  function handlePick(list) {
    if (!item) return
    const already = list.items.some(
      (entry) => entry.mediaType === item.mediaType && Number(entry.id) === Number(item.id),
    )
    const result = already ? 'already' : addItem(list.id, item)
    onPicked?.(list, result)
    close()
  }

  const picking = Boolean(item) && !creating

  return (
    <Modal open={isOpen} onClose={close} labelledBy={titleId}>
      {picking ? (
        <>
          <h2 id={titleId} className="modal-title">
            Add to a list
          </h2>
          <p className="modal-subtitle">Choose a collection for this title.</p>
          <ul className="modal-choices">
            {lists.map((list) => {
              const already = list.items.some(
                (entry) =>
                  entry.mediaType === item.mediaType && Number(entry.id) === Number(item.id),
              )
              return (
                <li key={list.id}>
                  <button
                    type="button"
                    className="modal-choice"
                    onClick={() => handlePick(list)}
                    disabled={already}
                  >
                    <span>{list.name}</span>
                    <span className="modal-choice-meta">
                      {already ? 'Already added' : `${list.items.length} titles`}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <button type="button" className="modal-secondary" onClick={() => setCreating(true)}>
            Create new list
          </button>
        </>
      ) : (
        <form onSubmit={handleCreate}>
          <h2 id={titleId} className="modal-title">
            New list
          </h2>
          <p className="modal-subtitle">Give this collection a name.</p>
          <label className="modal-label">
            Name
            <input
              className="modal-input"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (error) setError('')
              }}
              maxLength={60}
              required
            />
          </label>
          {error && (
            <p className="modal-error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button
              type="button"
              className="modal-cancel"
              onClick={() => (item ? setCreating(false) : close())}
            >
              Cancel
            </button>
            <button type="submit" className="modal-submit">
              Create
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default WatchlistModal
