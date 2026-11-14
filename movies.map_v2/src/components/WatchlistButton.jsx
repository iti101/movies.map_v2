import { useState } from 'react'
import { useWatchlist } from '../context/watchlist-context.js'
import Button from './Button.jsx'
import WatchlistModal from './WatchlistModal.jsx'

function inList(list, item) {
  return list.items.some(
    (entry) => entry.mediaType === item.mediaType && Number(entry.id) === Number(item.id),
  )
}

export default function WatchlistButton({ item, isLoggedIn, onRequestLogin }) {
  const { lists, addItem } = useWatchlist()
  const [note, setNote] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const saved = lists.some((list) => inList(list, item))

  function handleClick() {
    if (!isLoggedIn) {
      onRequestLogin()
      return
    }
    if (lists.length > 1) {
      setPickerOpen(true)
      return
    }
    const result = addItem(lists[0]?.id, item)
    setNote(result === 'already' ? 'Already in your watchlist' : 'Added to your watchlist')
  }

  function handlePicked(list, result) {
    setPickerOpen(false)
    if (!list) return
    setNote(result === 'already' ? `Already in ${list.name}` : `Added to ${list.name}`)
  }

  return (
    <div className="detail__watchlist">
      <Button variant="solid" onClick={handleClick}>
        {saved || note ? 'In watchlist' : 'Add to Watchlist'}
      </Button>
      {note && (
        <p className="detail__hint" role="status">
          {note}
        </p>
      )}
      <WatchlistModal
        isOpen={pickerOpen}
        item={item}
        onClose={() => setPickerOpen(false)}
        onPicked={handlePicked}
      />
    </div>
  )
}
