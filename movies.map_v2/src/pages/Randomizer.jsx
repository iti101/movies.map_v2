import { useEffect, useId, useRef, useState } from 'react'
import { discoverTmdb, loadGenres, searchPeople } from '../API/tmdb.js'
import Button from '../components/Button.jsx'
import MovieCard from '../components/MovieCard.jsx'
import './Randomizer.css'

const TYPE_OPTIONS = [
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'TV' },
  { id: 'all', label: 'All' },
]

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

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

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
  return TYPE_OPTIONS.find((option) => option.id === type)?.label ?? 'Movies'
}

function Randomizer({ onSelect }) {
  const personFieldId = useId()
  const personBoxRef = useRef(null)

  const [stepIndex, setStepIndex] = useState(0)
  const [phase, setPhase] = useState('setup')
  const [type, setType] = useState('movie')
  const [genres, setGenres] = useState([])
  const [wantGenres, setWantGenres] = useState([])
  const [avoidGenres, setAvoidGenres] = useState([])
  const [personQuery, setPersonQuery] = useState('')
  const [person, setPerson] = useState(null)
  const [personMatches, setPersonMatches] = useState([])
  const [personStatus, setPersonStatus] = useState('idle')
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
    let cancelled = false
    loadGenres(type)
      .then((list) => {
        if (cancelled) return
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
      .catch(() => {
        if (!cancelled) setGenres([])
      })
    return () => {
      cancelled = true
    }
  }, [type])

  useEffect(() => {
    setPool([])
    setIndex(0)
    setStatus('idle')
    setError('')
    setPhase('setup')
  }, [type, wantGenres, avoidGenres, person])

  useEffect(() => {
    if (person) {
      setPersonMatches([])
      setPersonStatus('idle')
      return undefined
    }

    const trimmed = personQuery.trim()
    if (trimmed.length < 2) {
      setPersonMatches([])
      setPersonStatus('idle')
      return undefined
    }

    let cancelled = false
    setPersonStatus('loading')
    const timer = window.setTimeout(() => {
      searchPeople(trimmed)
        .then((matches) => {
          if (cancelled) return
          setPersonMatches(matches)
          setPersonStatus(matches.length ? 'ready' : 'empty')
        })
        .catch(() => {
          if (cancelled) return
          setPersonMatches([])
          setPersonStatus('empty')
        })
    }, 280)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [personQuery, person])

  useEffect(() => {
    function onPointerDown(event) {
      if (!personBoxRef.current?.contains(event.target)) {
        setPersonMatches([])
      }
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [])

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

      if (!items.length) {
        setPool([])
        setIndex(0)
        setStatus('empty')
        setPhase('result')
        return
      }

      setPool(items)
      setIndex(randomInt(0, items.length - 1))
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
  }

  function handleAvoid(genre) {
    setAvoidGenres((current) => toggleGenre(current, genre))
    setWantGenres((current) => current.filter((entry) => entry.id !== genre.id))
  }

  function clearPerson() {
    setPerson(null)
    setPersonQuery('')
    setPersonMatches([])
    setPersonStatus('idle')
  }

  function stepSummary(stepId) {
    if (stepId === 'type') return typeLabel(type)
    if (stepId === 'want') return namesList(wantGenres, 'Open to anything')
    if (stepId === 'avoid') return namesList(avoidGenres, 'Nothing excluded')
    if (stepId === 'person') return person?.name || 'No one specific'
    return ''
  }

  return (
    <div className={`randomizer${hasResult ? ' randomizer--has-pick' : ''}`}>
      <header className="randomizer__intro">
        <h2 className="randomizer__title">Randomizer</h2>
        <p className="randomizer__lead">
          {hasResult
            ? 'Here’s a pick from your filters. Browse nearby titles or roll again.'
            : 'Answer a few quick prompts — then we’ll surprise you.'}
        </p>
      </header>

      <nav className="randomizer__steps" aria-label="Filter steps">
        {STEPS.map((entry, index) => {
          const done = index < stepIndex || phase === 'result'
          const current = phase === 'setup' && index === stepIndex
          return (
            <button
              key={entry.id}
              type="button"
              className={[
                'randomizer__step',
                current && 'randomizer__step--current',
                done && 'randomizer__step--done',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => goToStep(index)}
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
              <div className="randomizer__chips">
                {TYPE_OPTIONS.map((option) => (
                  <Button
                    key={option.id}
                    active={type === option.id}
                    onClick={() => setType(option.id)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}

            {step.id === 'want' && (
              <div className="randomizer__genre-row">
                {genres.map((genre) => (
                  <Button
                    key={`want-${genre.id}`}
                    active={wantGenres.some((entry) => entry.id === genre.id)}
                    onClick={() => handleWant(genre)}
                  >
                    {genre.name}
                  </Button>
                ))}
              </div>
            )}

            {step.id === 'avoid' && (
              <div className="randomizer__genre-row">
                {genres.map((genre) => (
                  <Button
                    key={`avoid-${genre.id}`}
                    active={avoidGenres.some((entry) => entry.id === genre.id)}
                    onClick={() => handleAvoid(genre)}
                  >
                    {genre.name}
                  </Button>
                ))}
              </div>
            )}

            {step.id === 'person' && (
              <div className="randomizer__person" ref={personBoxRef}>
                {person ? (
                  <div className="randomizer__person-picked">
                    <span>{person.name}</span>
                    <button
                      type="button"
                      className="randomizer__person-clear"
                      onClick={clearPerson}
                      aria-label={`Clear ${person.name}`}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      id={personFieldId}
                      className="randomizer__person-input"
                      type="search"
                      value={personQuery}
                      onChange={(event) => setPersonQuery(event.target.value)}
                      placeholder="Actor or director name"
                      aria-label="Filter by actor or director"
                      autoComplete="off"
                    />
                    {personStatus === 'loading' && (
                      <p className="randomizer__person-hint">Searching…</p>
                    )}
                    {personStatus === 'empty' && personQuery.trim().length >= 2 && (
                      <p className="randomizer__person-hint">No people found.</p>
                    )}
                    {personMatches.length > 0 && (
                      <ul className="randomizer__person-matches" role="listbox">
                        {personMatches.map((match) => (
                          <li key={match.id}>
                            <button
                              type="button"
                              role="option"
                              onClick={() => {
                                setPerson(match)
                                setPersonQuery(match.name)
                                setPersonMatches([])
                              }}
                            >
                              {match.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
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
