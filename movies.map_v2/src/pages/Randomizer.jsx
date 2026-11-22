import Button from '../components/Button.jsx'
import ChipRow from '../components/ChipRow.jsx'
import MovieCard from '../components/MovieCard.jsx'
import PersonTypeahead from '../components/PersonTypeahead.jsx'
import { cn } from '../lib/format.js'
import { RANDOMIZER_TYPES } from '../lib/media.js'
import { STEPS, useRandomizer } from './randomizer/useRandomizer.js'
import './Randomizer.css'

function Randomizer({ onSelect }) {
  const {
    stepIndex,
    phase,
    type,
    personQuery,
    person,
    status,
    error,
    genres,
    genresLoading,
    step,
    isLastStep,
    pick,
    canBrowse,
    hasResult,
    wantGenres,
    avoidGenres,
    setPersonQuery,
    goToStep,
    goNext,
    goBack,
    showPrevious,
    showNext,
    handleWant,
    handleAvoid,
    selectType,
    selectPerson,
    clearPerson,
    roll,
    stepSummary,
  } = useRandomizer()

  const genreChips = {
    className: 'randomizer__genre-row',
    loading: genresLoading,
    loadingLabel: 'Loading genres…',
    messageClassName: 'randomizer__message',
    items: genres,
  }

  return (
    <div className={cn('randomizer', hasResult && 'randomizer--has-pick')}>
      <header className="randomizer__intro">
        <h2 className="randomizer__title">Randomizer</h2>
        <p className="randomizer__lead">
          {hasResult
            ? 'Here’s a pick from your filters. Browse nearby titles or roll again.'
            : 'Answer a few quick prompts — then we’ll surprise you.'}
        </p>
      </header>

      <nav className="randomizer__steps" aria-label="Filter steps">
        {STEPS.map((entry, stepPosition) => {
          const done = stepPosition < stepIndex || phase === 'result'
          const current = phase === 'setup' && stepPosition === stepIndex
          return (
            <button
              key={entry.id}
              type="button"
              className={cn(
                'randomizer__step',
                current && 'randomizer__step--current',
                done && 'randomizer__step--done',
              )}
              onClick={() => goToStep(stepPosition)}
              aria-current={current ? 'step' : undefined}
            >
              <span className="randomizer__step-number" aria-hidden="true">
                {entry.number}
              </span>
              <span className="randomizer__step-label">{entry.label}</span>
            </button>
          )
        })}
      </nav>

      {phase === 'setup' ? (
        <section
          key={step.id}
          className="randomizer__panel"
          aria-labelledby={`randomizer-step-${step.id}`}
        >
          <div className="randomizer__panel-copy">
            <p className="randomizer__panel-kicker">Step {step.number} of {STEPS.length}</p>
            <h3 id={`randomizer-step-${step.id}`} className="randomizer__panel-title">
              {step.title}
            </h3>
            <p className="randomizer__panel-hint">{step.hint}</p>
          </div>

          <div className="randomizer__choices">
            {step.id === 'type' && (
              <ChipRow
                className="randomizer__chips"
                items={RANDOMIZER_TYPES}
                selected={type}
                onSelect={(option) => selectType(option.id)}
              />
            )}

            {step.id === 'want' && (
              <ChipRow {...genreChips} selected={wantGenres} onSelect={handleWant} />
            )}

            {step.id === 'avoid' && (
              <ChipRow {...genreChips} selected={avoidGenres} onSelect={handleAvoid} />
            )}

            {step.id === 'person' && (
              <PersonTypeahead
                value={person}
                query={personQuery}
                onQueryChange={setPersonQuery}
                onSelect={selectPerson}
                onClear={clearPerson}
              />
            )}
          </div>

          <div className="randomizer__actions">
            {stepIndex > 0 && (
              <Button className="randomizer__action" onClick={goBack}>
                Back
              </Button>
            )}
            {!isLastStep && step.id !== 'type' && (
              <Button className="randomizer__action" onClick={goNext}>
                Skip
              </Button>
            )}
            <Button
              className="randomizer__action randomizer__action--primary"
              variant="solid"
              onClick={goNext}
              disabled={status === 'loading'}
            >
              {isLastStep
                ? status === 'loading'
                  ? 'Rolling…'
                  : 'Surprise me'
                : 'Continue'}
            </Button>
          </div>
        </section>
      ) : (
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
            {status === 'error' && (
              <p className="randomizer__message randomizer__message--error">{error}</p>
            )}

            {status === 'empty' && (
              <p className="randomizer__message">
                Nothing matched. Loosen a filter and try again.
              </p>
            )}

            {status === 'success' && pick && (
              <div className="randomizer__suggestion">
                <button
                  type="button"
                  className="randomizer__nav randomizer__nav--prev"
                  aria-label="Previous suggestion"
                  onClick={showPrevious}
                  disabled={!canBrowse}
                >
                  <span className="randomizer__nav-icon" aria-hidden="true" />
                </button>
                <ul className="randomizer__pick">
                  <MovieCard item={pick} onSelect={onSelect} />
                </ul>
                <button
                  type="button"
                  className="randomizer__nav randomizer__nav--next"
                  aria-label="Next suggestion"
                  onClick={showNext}
                  disabled={!canBrowse}
                >
                  <span className="randomizer__nav-icon" aria-hidden="true" />
                </button>
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
      )}
    </div>
  )
}

export default Randomizer
