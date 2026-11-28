import Button from '../../components/Button.jsx'
import MovieCard from '../../components/MovieCard.jsx'
import StatusCopy from '../../components/StatusCopy.jsx'
import { cn } from '../../lib/format.js'
import { STEPS } from './useRandomizer.js'

function BrowseButton({ direction, label, onClick, disabled }) {
  return (
    <button
      type="button"
      className={cn('randomizer__nav', `randomizer__nav--${direction}`)}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="randomizer__nav-icon" aria-hidden="true" />
    </button>
  )
}

export default function ResultView({ randomizer, onSelect }) {
  const {
    status,
    error,
    pick,
    canBrowse,
    goToStep,
    goBack,
    showPrevious,
    showNext,
    roll,
    stepSummary,
  } = randomizer

  return (
    <section className="randomizer__result-view" aria-live="polite">
      <ul className="randomizer__summary">
        {STEPS.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className="randomizer__summary-item"
              onClick={() => goToStep(entry.number - 1)}
            >
              <span className="randomizer__summary-step">{entry.number}</span>
              <span className="randomizer__summary-copy">
                <span className="randomizer__summary-label">{entry.label}</span>
                <span className="randomizer__summary-value">{stepSummary(entry.id)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="randomizer__result">
        <StatusCopy
          status={status}
          error={error}
          empty="Nothing matched. Loosen a filter and try again."
        />

        {status === 'success' && pick && (
          <div className="randomizer__suggestion">
            <BrowseButton
              direction="prev"
              label="Previous suggestion"
              onClick={showPrevious}
              disabled={!canBrowse}
            />
            <ul className="randomizer__pick">
              <MovieCard item={pick} onSelect={onSelect} />
            </ul>
            <BrowseButton
              direction="next"
              label="Next suggestion"
              onClick={showNext}
              disabled={!canBrowse}
            />
          </div>
        )}
      </div>

      <div className="randomizer__actions">
        <Button className="randomizer__action" onClick={goBack}>
          Adjust filters
        </Button>
        <Button
          className="randomizer__action randomizer__action--primary"
          variant="solid"
          onClick={roll}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Rolling…' : 'Surprise me again'}
        </Button>
      </div>
    </section>
  )
}
