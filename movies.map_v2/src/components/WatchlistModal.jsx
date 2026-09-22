import { useEffect, useState } from 'react'
import { useWatchlist } from '../context/watchlist-context.js'
import './WatchlistModal.css'

function WatchlistModal({ isOpen, onClose }) {
  const { createList } = useWatchlist()
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return undefined

    function onKeyDown(event) {
      if (event.key !== 'Escape') return
      setName('')
      setError('')
      onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function close() {
    setName('')
    setError('')
    onClose()
  }

  function handleSubmit(event) {
    event.preventDefault()
    const list = createList(name)
    if (!list) {
      setError('Enter a name for this list.')
      return
    }
    setName('')
    setError('')
    onClose()
  }

  return (
    <div className="watchlist-modal" role="presentation" onClick={close}>
      <form
        className="watchlist-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-list-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 id="create-list-title" className="watchlist-modal__title">
          New list
        </h2>
        <p className="watchlist-modal__subtitle">Give this collection a name.</p>
        <label className="watchlist-modal__label">
          Name
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              if (error) setError('')
            }}
            maxLength={60}
            required
            autoFocus
          />
        </label>
        {error && (
          <p className="watchlist-modal__error" role="alert">
            {error}
          </p>
        )}
        <div className="watchlist-modal__actions">
          <button type="button" className="watchlist-modal__cancel" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="watchlist-modal__submit">
            Create
          </button>
        </div>
      </form>
    </div>
  )
}

export default WatchlistModal
