import './DidYouMean.css'

function DidYouMean({ suggestion, onAccept }) {
  if (!suggestion) return null

  return (
    <p className="did-you-mean" role="status">
      Did you mean{' '}
      <button
        type="button"
        className="did-you-mean__btn"
        onClick={() => onAccept(suggestion)}
      >
        {suggestion}
      </button>
      ?
    </p>
  )
}

export default DidYouMean
