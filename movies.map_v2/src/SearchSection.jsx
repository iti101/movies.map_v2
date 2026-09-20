import { useEffect, useRef, useState } from 'react'

const TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/movie'
const POSTER_BASE = 'https://image.tmdb.org/t/p/w185'

/* getYear takes a date like "2010-07-16" and returns just "2010". If theres no date, it returns null. */
function getYear(date) {
  if (!date) return null
  return date.slice(0, 4)
}
/*searchMovies is an async function that actually asks TMDB for movies matching a query*/
async function searchMovies(query) {
  const apiKey = import.meta.env.VITE_TMDB_API_KEY

/*Reads your API key from .env.local via Vite (VITE_TMDB_API_KEY).*/
  if (!apiKey) {
    throw new Error('Missing TMDB API key. Add VITE_TMDB_API_KEY to .env.local and restart the dev server.')
  }

/*Build a URL object from the TMDB search endpoint. Add query params: the API key, the search text, and “don’t include adult movies.” */
  const url = new URL(TMDB_SEARCH_URL)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('query', query)
  url.searchParams.set('include_adult', 'false')

/*Send the request with fetch and wait for the response.*/  
  const response = await fetch(url)

/*If the response is not OK, throw an error.*/
  if (!response.ok) {
    throw new Error('Movie search failed. Check your API key and try again.')
  }

/* the result is turned into a JavaScript object. If there are no results, return an empty array.*/
  const data = await response.json()
  return data.results ?? []
} 
/*
query = what’s currently typed in the box.
results = the movies returned from TMDB. 
status = where we are: idle, loading, success, empty, or error. 
error = the error message to show if something went wrong.
searchedQuery = the text that was actually searched (used in the “no results” message).
*/

function SearchSection() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [searchedQuery, setSearchedQuery] = useState('')
  const resultsRef = useRef(null)

  useEffect(() => {
    const resultsEl = resultsRef.current
    if (!resultsEl) return

    function onWheel(event) {
      const canScroll = resultsEl.scrollHeight > resultsEl.clientHeight
      if (!canScroll) return

      const scrollingDown = event.deltaY > 0
      const atTop = resultsEl.scrollTop <= 0
      const atBottom =
        resultsEl.scrollTop + resultsEl.clientHeight >= resultsEl.scrollHeight - 1

      if ((scrollingDown && atBottom) || (!scrollingDown && atTop)) return

      event.preventDefault()
      resultsEl.scrollTop += event.deltaY
    }

    resultsEl.addEventListener('wheel', onWheel, { passive: false })
    return () => resultsEl.removeEventListener('wheel', onWheel)
  }, [status])

/*handleSubmit runs when the form is submitted (button click or Enter).*/
  async function handleSubmit(event) {
    event.preventDefault()

/*Trim spaces from the typed text. 44–50. If the box is empty after trimming: reset to idle, clear results/error/last search, and stop.*/
    const trimmed = query.trim()
    if (!trimmed) {
      setStatus('idle')
      setResults([])
      setError('')
      setSearchedQuery('')
      return
    }

/*Otherwise: show loading, clear old errors, remember what was searched.*/
    setStatus('loading')
    setError('')
    setSearchedQuery(trimmed)

/*
Call TMDB. On success, store the movies. If the list is empty, status becomes empty; otherwise success.
If anything throws, clear results, set status to error, and show the error message.*/
    try {
      const movies = await searchMovies(trimmed)
      setResults(movies)
      setStatus(movies.length === 0 ? 'empty' : 'success')
    } catch (err) {
      setResults([])
      setStatus('error')
      setError(err.message || 'Something went wrong.')
    }
  }
/*this is the code that actually gets rendered to the DOM */ 


  return (
    <div className="search-section">
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          className="search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search movies..."
          aria-label="Search movies"
        />
        <button className="search-button" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Searching…' : 'Search'}
        </button>
      </form>

      <div className="search-results" ref={resultsRef} aria-live="polite">
        {status === 'idle' && (
          <p className="search-message">Search for a movie title to get started.</p>
        )}

        {status === 'loading' && (
          <p className="search-message">Searching…</p>
        )}

        {status === 'error' && (
          <p className="search-message search-message-error">{error}</p>
        )}

        {status === 'empty' && (
          <p className="search-message">No movies found for “{searchedQuery}”.</p>
        )}

        {status === 'success' && (
          <ul className="search-grid">
            {results.map((movie) => {
              const year = getYear(movie.release_date)
              const posterSrc = movie.poster_path
                ? `${POSTER_BASE}${movie.poster_path}`
                : null

              return (
                <li key={movie.id} className="search-card">
                  {posterSrc ? (
                    <img
                      className="search-poster"
                      src={posterSrc}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <div className="search-poster search-poster-fallback" aria-hidden="true">
                      No poster
                    </div>
                  )}
                  <div className="search-card-meta">
                    <h3 className="search-card-title">{movie.title}</h3>
                    {year && <p className="search-card-year">{year}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export default SearchSection
