import { useState } from 'react'
import { discoverTmdb } from '../../API/tmdb.js'
import { useGenres } from '../../hooks/useGenres.js'
import { useTask } from '../../hooks/useTask.js'
import { toggleById, uniqueBy } from '../../lib/list.js'
import { mediaKey, RANDOMIZER_TYPES } from '../../lib/media.js'
import { randomInt, shuffle } from '../../lib/shuffle.js'

export const STEPS = [
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

function namesList(list, empty = 'Any') {
  if (!list.length) return empty
  return list.map((entry) => entry.name).join(', ')
}

function typeLabel(type) {
  return RANDOMIZER_TYPES.find((option) => option.id === type)?.label ?? 'Movies'
}

export function useRandomizer() {
  const [stepIndex, setStepIndex] = useState(0)
  const [phase, setPhase] = useState('setup')
  const [type, setType] = useState('movie')
  const [wantGenres, setWantGenres] = useState([])
  const [avoidGenres, setAvoidGenres] = useState([])
  const [personQuery, setPersonQuery] = useState('')
  const [person, setPerson] = useState(null)
  const [pool, setPool] = useState([])
  const [index, setIndex] = useState(0)
  const { status, error, setStatus, run, reset } = useTask()
  const { genres, loading: genresLoading } = useGenres(type)

  const step = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1
  const pick = pool[index] ?? null
  const canBrowse = pool.length > 1
  const hasResult = phase === 'result' && Boolean(pick)
  const genreIds = new Set(genres.map((genre) => genre.id))
  const activeWant = wantGenres.filter((genre) => genreIds.has(genre.id))
  const activeAvoid = avoidGenres.filter((genre) => genreIds.has(genre.id))

  function resetPool() {
    setPool([])
    setIndex(0)
  }

  function resetRoll() {
    resetPool()
    reset()
    setPhase('setup')
  }

  async function roll() {
    const result = await run(async (signal) => {
      const filters = {
        type,
        genres: activeWant,
        excludeGenres: activeAvoid,
        personId: person?.id,
        signal,
      }
      const first = await discoverTmdb({ ...filters, page: 1 })
      const lastPage = Math.min(Math.max(first.totalPages || 1, 1), MAX_RANDOM_PAGE)
      const page = randomInt(1, lastPage)
      const { items } = page === 1 ? first : await discoverTmdb({ ...filters, page })
      return shuffle(uniqueBy(items, mediaKey))
    })

    if (result.aborted) return

    if (result.error) {
      resetPool()
      setPhase('result')
      return
    }

    if (!result.value.length) {
      resetPool()
      setStatus('empty')
      setPhase('result')
      return
    }

    setPool(result.value)
    setIndex(0)
    setStatus('success')
    setPhase('result')
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

  function pickGenre(setChosen, setOther, genre) {
    setChosen((current) => toggleById(current, genre))
    setOther((current) => current.filter((entry) => entry.id !== genre.id))
    resetRoll()
  }

  function handleWant(genre) {
    pickGenre(setWantGenres, setAvoidGenres, genre)
  }

  function handleAvoid(genre) {
    pickGenre(setAvoidGenres, setWantGenres, genre)
  }

  function selectType(nextType) {
    setType(nextType)
    resetRoll()
  }

  function selectPerson(match) {
    setPerson(match)
    setPersonQuery(match.name)
    resetRoll()
  }

  function clearPerson() {
    setPerson(null)
    setPersonQuery('')
    resetRoll()
  }

  function stepSummary(stepId) {
    if (stepId === 'type') return typeLabel(type)
    if (stepId === 'want') return namesList(activeWant, 'Open to anything')
    if (stepId === 'avoid') return namesList(activeAvoid, 'Nothing excluded')
    if (stepId === 'person') return person?.name || 'No one specific'
    return ''
  }

  return {
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
  }
}
