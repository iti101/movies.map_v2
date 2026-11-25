import { useState } from 'react'
import { getSearchLabel, isValidYear, searchPageWithSuggestion } from '../../API/tmdb.js'
import { useGenres } from '../../hooks/useGenres.js'
import { useTask } from '../../hooks/useTask.js'

export function useSearch({ onSeeAll } = {}) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('movie')
  const [releaseDateOn, setReleaseDateOn] = useState(false)
  const [year, setYear] = useState('')
  const [genreOn, setGenreOn] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [results, setResults] = useState([])
  const [totalPages, setTotalPages] = useState(0)
  const [submitted, setSubmitted] = useState(null)
  const [suggestion, setSuggestion] = useState('')
  const { status, error, setStatus, run, reset } = useTask()
  const { genres, loading: genresLoading } = useGenres(type)

  const filtersDisabled = type === 'person'
  const hasResults = status === 'success' && results.length > 0
  const yearFilter = releaseDateOn && isValidYear(year) ? year : ''
  const genreFilter = genreOn && !filtersDisabled ? selectedGenre : null

  function clearResults() {
    setResults([])
    setTotalPages(0)
    setSuggestion('')
  }

  async function runSearch(nextQuery = query) {
    const trimmed = nextQuery.trim()
    const nextSubmitted = {
      query: trimmed,
      type,
      year: yearFilter,
      genre: genreFilter,
    }

    if (!trimmed && !yearFilter && !genreFilter) {
      reset()
      clearResults()
      setSubmitted(null)
      return
    }

    setSubmitted(nextSubmitted)
    setSuggestion('')

    const result = await run((signal) => searchPageWithSuggestion({ ...nextSubmitted, signal }))

    if (result.aborted) return
    if (result.error) {
      clearResults()
      return
    }

    setResults(result.value.items)
    setTotalPages(result.value.totalPages)
    setSuggestion(result.value.suggestion)
    setStatus(result.value.items.length === 0 ? 'empty' : 'success')
  }

  function handleSubmit(event) {
    event.preventDefault()
    runSearch(query)
  }

  function handleAcceptSuggestion(nextQuery) {
    setQuery(nextQuery)
    runSearch(nextQuery)
  }

  function selectType(nextType) {
    setType(nextType)
    setSelectedGenre(null)
    if (nextType === 'person') {
      setReleaseDateOn(false)
      setYear('')
      setGenreOn(false)
    }
  }

  function toggleReleaseDate() {
    setReleaseDateOn((on) => {
      if (on) setYear('')
      return !on
    })
  }

  function toggleGenre() {
    setGenreOn((on) => {
      if (on) setSelectedGenre(null)
      return !on
    })
  }

  function handleSeeAll() {
    if (!submitted) return
    onSeeAll?.({ ...submitted, results, totalPages })
  }

  return {
    query,
    setQuery,
    type,
    releaseDateOn,
    year,
    setYear,
    genreOn,
    selectedGenre,
    setSelectedGenre,
    results,
    suggestion,
    status,
    error,
    genres,
    genresLoading,
    filtersDisabled,
    hasResults,
    searchLabel: getSearchLabel(submitted ?? {}),
    handleSubmit,
    handleAcceptSuggestion,
    selectType,
    toggleReleaseDate,
    toggleGenre,
    handleSeeAll,
  }
}
