import Button from './Button.jsx'
import './DidYouMean.css'

function DidYouMean({ suggestion, onAccept }) {
  if (!suggestion) return null

  return (
    <p className="did-you-mean" role="status">
      Did you mean{' '}
      <Button
        className="did-you-mean__btn"
        variant="link"
        onClick={() => onAccept(suggestion)}
      >
        {suggestion}
      </Button>
      ?
    </p>
  )
}

export default DidYouMean
