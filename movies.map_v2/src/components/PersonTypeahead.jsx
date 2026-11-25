import { useEffect, useId, useRef, useState } from 'react'
import { searchPeople } from '../API/tmdb.js'
import { useAsync } from '../hooks/useAsync.js'
import { useDebouncedValue } from '../hooks/useDebouncedValue.js'
import './Field.css'
import './PersonTypeahead.css'

export default function PersonTypeahead({ value, query, onQueryChange, onSelect, onClear }) {
  const fieldId = useId()
  const boxRef = useRef(null)
  const debouncedQuery = useDebouncedValue(query, 280)
  const trimmed = value ? '' : debouncedQuery.trim()
  const enabled = trimmed.length >= 2
  const { data, status } = useAsync(
    (signal) => (enabled ? searchPeople(trimmed, { signal }) : Promise.resolve([])),
    [trimmed, enabled],
    { keepPreviousData: true },
  )
  const [dismissedQuery, setDismissedQuery] = useState(null)
  const dismissed = dismissedQuery === trimmed
  const people = dismissed ? [] : (data ?? [])

  useEffect(() => {
    function onPointerDown(event) {
      if (!boxRef.current?.contains(event.target)) setDismissedQuery(trimmed)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [trimmed])

  const liveHint = !value && query.trim().length >= 2
  const showMatches = liveHint && people.length > 0
  const showLoading = liveHint && enabled && status === 'loading' && people.length === 0
  const showEmpty = liveHint && enabled && !dismissed && status === 'success' && people.length === 0

  return (
    <div className="typeahead" ref={boxRef}>
      {value ? (
        <div className="ui-field typeahead__picked">
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
            className="ui-field typeahead__input"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Actor or director name"
            aria-label="Filter by actor or director"
            autoComplete="off"
          />
          {showLoading && <p className="typeahead__hint">Searching…</p>}
          {showEmpty && <p className="typeahead__hint">No people found.</p>}
          {showMatches && (
            <ul className="typeahead__matches" role="listbox">
              {people.map((match) => (
                <li key={match.id}>
                  <button
                    type="button"
                    role="option"
                    onClick={() => {
                      onSelect(match)
                      setDismissedQuery(trimmed)
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
