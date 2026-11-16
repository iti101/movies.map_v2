import DidYouMean from './DidYouMean.jsx'

export default function SearchStatus({
  status,
  error,
  label,
  suggestion,
  onAcceptSuggestion,
  loadingText = 'Searching…',
}) {
  return (
    <>
      {status === 'loading' && <p className="search-message">{loadingText}</p>}
      {status === 'error' && (
        <p className="search-message search-message-error">{error}</p>
      )}
      {status === 'empty' && (
        <p className="search-message">No results found for “{label}”.</p>
      )}
      {(status === 'empty' || status === 'success') && (
        <DidYouMean suggestion={suggestion} onAccept={onAcceptSuggestion} />
      )}
    </>
  )
}
