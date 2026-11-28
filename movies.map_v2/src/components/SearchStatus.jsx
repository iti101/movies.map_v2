import DidYouMean from './DidYouMean.jsx'
import StatusCopy from './StatusCopy.jsx'

export default function SearchStatus({
  status,
  error,
  label,
  suggestion,
  onAcceptSuggestion,
  loading = 'Searching…',
  empty,
}) {
  return (
    <>
      <StatusCopy
        status={status}
        error={error}
        loading={loading}
        empty={empty ?? (label ? `No results found for “${label}”.` : undefined)}
      />
      {(status === 'empty' || status === 'success') && (
        <DidYouMean suggestion={suggestion} onAccept={onAcceptSuggestion} />
      )}
    </>
  )
}
