import { useId, useState } from 'react'
import './StarRating.css'

/** Snap a number onto 0.5-star steps between 0.5 and 5 (0 stays 0). */
function clampHalfStar(value) {
  if (!Number.isFinite(value) || value <= 0) return 0
  const stepped = Math.round(value * 2) / 2
  return Math.min(5, Math.max(0.5, stepped))
}

/** Left half of a star → N-0.5; right half → N. */
function valueFromPointer(event, starIndex) {
  const { left, width } = event.currentTarget.getBoundingClientRect()
  if (width <= 0) return starIndex
  const ratio = (event.clientX - left) / width
  return ratio < 0.5 ? starIndex - 0.5 : starIndex
}

/** 0–5 stars, half-star precision. `interactive={false}` is display-only. */
export default function StarRating({
  value = 0,
  onChange,
  interactive = true,
  label = 'Rating',
}) {
  const groupId = useId()
  const [hoverValue, setHoverValue] = useState(0)
  const displayValue = interactive && hoverValue > 0 ? hoverValue : value

  function handleMove(event, starIndex) {
    if (!interactive) return
    setHoverValue(clampHalfStar(valueFromPointer(event, starIndex)))
  }

  function handleLeave() {
    if (!interactive) return
    setHoverValue(0)
  }

  function handleClick(event, starIndex) {
    if (!interactive || !onChange) return
    onChange(clampHalfStar(valueFromPointer(event, starIndex)))
  }

  return (
    <div
      className={`star-rating${interactive ? ' star-rating--interactive' : ''}`}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={label}
      onMouseLeave={handleLeave}
    >
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const fill = Math.max(0, Math.min(1, displayValue - (starIndex - 1)))
        const checked = interactive && value === starIndex

        return (
          <button
            key={starIndex}
            type="button"
            className="star-rating__star"
            disabled={!interactive}
            aria-label={`${starIndex} star${starIndex === 1 ? '' : 's'}`}
            aria-checked={interactive ? checked : undefined}
            role={interactive ? 'radio' : undefined}
            tabIndex={interactive ? (starIndex === 1 || checked ? 0 : -1) : undefined}
            onMouseMove={(event) => handleMove(event, starIndex)}
            onClick={(event) => handleClick(event, starIndex)}
          >
            <span className="star-rating__glyph" aria-hidden="true">
              <span className="star-rating__empty">★</span>
              <span
                className="star-rating__fill"
                style={{ width: `${fill * 100}%` }}
                id={`${groupId}-${starIndex}`}
              >
                ★
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
