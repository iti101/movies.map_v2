import { useEffect, useId, useRef, useState } from 'react'
import { searchPeople } from '../API/tmdb.js'
import { isAbortError } from '../API/tmdb/client.js'
import { useDebouncedValue } from '../hooks/useDebouncedValue.js'
import './PersonTypeahead.css'

export default function PersonTypeahead({ value, query, onQueryChange, onSelect, onClear }) {
  const fieldId = useId()
  const boxRef = useRef(null)
  const debouncedQuery = useDebouncedValue(query, 280)
  const [matches, setMatches] = useState([])
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    if (value) return undefined

    const trimmed = debouncedQuery.trim()
    if (trimmed.length < 2) return undefined

    const controller = new AbortController()
    const pending = Promise.resolve().then(() => {
      setStatus('loading')
      return searchPeople(trimmed, { signal: controller.signal })
    })

    pending
      .then((people) => {
        if (controller.signal.aborted) return
        setMatches(people)
        setStatus(people.length ? 'ready' : 'empty')
      })
      .catch((error) => {
        if (isAbortError(error) || controller.signal.aborted) return
        setMatches([])
        setStatus('empty')
      })

    return () => controller.abort()
  }, [debouncedQuery, value])

  useEffect(() => {
    function onPointerDown(event) {
      if (!boxRef.current?.contains(event.target)) setMatches([])
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const trimmedQuery = query.trim()
  const showHint = !value && trimmedQuery.length >= 2
  const showMatches = !value && matches.length > 0

  return (
    <div className="typeahead" ref={boxRef}>
      {value ? (
        <div className="typeahead__picked">
          <span>{value.name}</span>
          <button
            type="button"
            className="typeahead__clear"
            onClick={onClear}
            aria-label={`Clear ${value.name}`}
          >
            ×
          </button>
        </div>
      ) : (
        <>
          <input
            id={fieldId}
            className="typeahead__input"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Actor or director name"
            aria-label="Filter by actor or director"
            autoComplete="off"
          />
          {showHint && status === 'loading' && <p className="typeahead__hint">Searching…</p>}
          {showHint && status === 'empty' && (
            <p className="typeahead__hint">No people found.</p>
          )}
          {showMatches && (
            <ul className="typeahead__matches" role="listbox">
              {matches.map((match) => (
                <li key={match.id}>
                  <button
                    type="button"
                    role="option"
                    onClick={() => {
                      onSelect(match)
                      setMatches([])
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
  )
}
