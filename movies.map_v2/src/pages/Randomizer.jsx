import { useEffect, useState } from 'react'
import { discoverTmdb, loadGenres } from '../API/tmdb.js'
import { isAbortError } from '../API/tmdb/client.js'
import Button from '../components/Button.jsx'
import ChipRow from '../components/ChipRow.jsx'
import MovieCard from '../components/MovieCard.jsx'
import PersonTypeahead from '../components/PersonTypeahead.jsx'
import { cn } from '../lib/format.js'
import { RANDOMIZER_TYPES } from '../lib/media.js'
import { randomInt, shuffle, uniqueBy } from '../lib/shuffle.js'
import './Randomizer.css'

const STEPS = [
  {
    id: 'type',
    number: 1,
    label: 'Format',
    title: 'What are you in the mood for?',
    hint: 'Start with movies, TV, or both.',
  },
  {
    id: 'want',
    number: 2,
    label: 'Want',
    title: 'Anything you want to see?',
    hint: 'Pick genres to lean toward — or skip.',
  },
  {
    id: 'avoid',
    number: 3,
    label: "Don't want",
    title: 'Anything to leave out?',
    hint: 'Exclude genres you definitely don’t want.',
  },
  {
    id: 'person',
    number: 4,
    label: 'Who',
    title: 'Anyone specific?',
    hint: 'Optional — filter by an actor or director.',
  },
]

const MAX_RANDOM_PAGE = 20

function toggleGenre(list, genre) {
  return list.some((entry) => entry.id === genre.id)
    ? list.filter((entry) => entry.id !== genre.id)
    : [...list, genre]
}

function namesList(list, empty = 'Any') {
  if (!list.length) return empty
  return list.map((entry) => entry.name).join(', ')
}

function typeLabel(type) {
  return RANDOMIZER_TYPES.find((option) => option.id === type)?.label ?? 'Movies'
}

function Randomizer({ onSelect }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [phase, setPhase] = useState('setup')
  const [type, setType] = useState('movie')
  const [genres, setGenres] = useState([])
  const [wantGenres, setWantGenres] = useState([])
  const [avoidGenres, setAvoidGenres] = useState([])
  const [personQuery, setPersonQuery] = useState('')
  const [person, setPerson] = useState(null)
  const [pool, setPool] = useState([])
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const step = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1
  const pick = pool[index] ?? null
  const canBrowse = pool.length > 1
  const hasResult = phase === 'result' && Boolean(pick)

  useEffect(() => {
    const controller = new AbortController()
    loadGenres(type, { signal: controller.signal })
      .then((list) => {
        setGenres(list)
        const ids = new Set(list.map((genre) => genre.id))
        setWantGenres((current) => {
          const next = current.filter((genre) => ids.has(genre.id))
          return next.length === current.length ? current : next
        })
        setAvoidGenres((current) => {
          const next = current.filter((genre) => ids.has(genre.id))
          return next.length === current.length ? current : next
        })
      })
      .catch((err) => {
        if (!isAbortError(err)) setGenres([])
      })
    return () => controller.abort()
  }, [type])

  function resetRoll() {
    setPool([])
    setIndex(0)
    setStatus('idle')
    setError('')
    setPhase('setup')
  }

  async function roll() {
    setStatus('loading')
    setError('')

    const filters = {
      type,
      genres: wantGenres,
      excludeGenres: avoidGenres,
      personId: person?.id,
    }

    try {
      const first = await discoverTmdb({ ...filters, page: 1 })
      const lastPage = Math.min(Math.max(first.totalPages || 1, 1), MAX_RANDOM_PAGE)
      const page = randomInt(1, lastPage)
      const { items } = page === 1 ? first : await discoverTmdb({ ...filters, page })
      const mixed = shuffle(uniqueBy(items, (item) => `${item.mediaType}-${item.id}`))

      if (!mixed.length) {
        setPool([])
        setIndex(0)
        setStatus('empty')
        setPhase('result')
        return
      }

      setPool(mixed)
      setIndex(0)
      setStatus('success')
      setPhase('result')
    } catch (err) {
      setPool([])
      setIndex(0)
      setStatus('error')
      setError(err.message || 'Something went wrong.')
      setPhase('result')
    }
  }

  function goToStep(nextIndex) {
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, nextIndex)))
    setPhase('setup')
  }

  function goNext() {
    if (isLastStep) {
      roll()
      return
    }
    setStepIndex((current) => current + 1)
  }

  function goBack() {
    if (phase === 'result') {
      setPhase('setup')
      setStepIndex(STEPS.length - 1)
      return
    }
    setStepIndex((current) => Math.max(0, current - 1))
  }

  function showPrevious() {
    if (!canBrowse) return
    setIndex((current) => (current - 1 + pool.length) % pool.length)
  }

  function showNext() {
    if (!canBrowse) return
    setIndex((current) => (current + 1) % pool.length)
  }

  function handleWant(genre) {
    setWantGenres((current) => toggleGenre(current, genre))
    setAvoidGenres((current) => current.filter((entry) => entry.id !== genre.id))
    resetRoll()
  }

  function handleAvoid(genre) {
    setAvoidGenres((current) => toggleGenre(current, genre))
    setWantGenres((current) => current.filter((entry) => entry.id !== genre.id))
    resetRoll()
  }

  function stepSummary(stepId) {
    if (stepId === 'type') return typeLabel(type)
    if (stepId === 'want') return namesList(wantGenres, 'Open to anything')
    if (stepId === 'avoid') return namesList(avoidGenres, 'Nothing excluded')
    if (stepId === 'person') return person?.name || 'No one specific'
    return ''
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
                isActive={(option) => type === option.id}
                onSelect={(option) => {
                  setType(option.id)
                  resetRoll()
                }}
              />
            )}

            {step.id === 'want' && (
              <ChipRow
                className="randomizer__genre-row"
                items={genres}
                isActive={(genre) => wantGenres.some((entry) => entry.id === genre.id)}
                onSelect={handleWant}
              />
            )}

            {step.id === 'avoid' && (
              <ChipRow
                className="randomizer__genre-row"
                items={genres}
                isActive={(genre) => avoidGenres.some((entry) => entry.id === genre.id)}
                onSelect={handleAvoid}
              />
            )}

            {step.id === 'person' && (
              <PersonTypeahead
                value={person}
                query={personQuery}
                onQueryChange={setPersonQuery}
                onSelect={(match) => {
                  setPerson(match)
                  setPersonQuery(match.name)
                  resetRoll()
                }}
                onClear={() => {
                  setPerson(null)
                  setPersonQuery('')
                  resetRoll()
                }}
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
