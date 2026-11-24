import Button from '../../components/Button.jsx'
import ChipRow from '../../components/ChipRow.jsx'
import PersonTypeahead from '../../components/PersonTypeahead.jsx'
import { RANDOMIZER_TYPES } from '../../lib/media.js'
import { STEPS } from './useRandomizer.js'

export default function SetupPanel({ randomizer }) {
  const {
    stepIndex,
    type,
    personQuery,
    person,
    status,
    genres,
    genresLoading,
    step,
    isLastStep,
    wantGenres,
    avoidGenres,
    setPersonQuery,
    goNext,
    goBack,
    handleWant,
    handleAvoid,
    selectType,
    selectPerson,
    clearPerson,
  } = randomizer

  const genreChips = {
    loading: genresLoading,
    loadingLabel: 'Loading genres…',
    messageClassName: 'randomizer__message',
    items: genres,
  }

  return (
    <section
      key={step.id}
      className="randomizer__panel"
      aria-labelledby={`randomizer-step-${step.id}`}
    >
      <div className="randomizer__panel-copy">
        <p className="randomizer__panel-kicker">
          Step {step.number} of {STEPS.length}
        </p>
        <h3 id={`randomizer-step-${step.id}`} className="randomizer__panel-title">
          {step.title}
        </h3>
        <p className="randomizer__panel-hint">{step.hint}</p>
      </div>

      <div className="randomizer__choices">
        {step.id === 'type' && (
          <ChipRow
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
  )
}
