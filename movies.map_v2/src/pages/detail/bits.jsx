import { useId } from 'react'
import Button from '../../components/Button.jsx'
import MediaImage from '../../components/MediaImage.jsx'
import ResultGrid from '../../components/ResultGrid.jsx'
import Select from '../../components/Select.jsx'
import { cn } from '../../lib/format.js'

export function Facts({ facts }) {
  if (!facts.length) return null
  return (
    <dl className="detail__facts">
      {facts.map((fact) => (
        <div key={fact.label} className="detail__fact">
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function PeopleLinks({ people, onOpen }) {
  if (!people?.length) return null
  return people.map((person, index) => (
    <span key={person.id}>
      {index > 0 ? ', ' : ''}
      <Button
        className="detail__person-link"
        variant="link"
        onClick={() => onOpen({ mediaType: 'person', id: person.id })}
      >
        {person.name}
      </Button>
    </span>
  ))
}

export function DetailSelect({ label, value, onChange, children }) {
  const selectId = useId()
  return (
    <label className="detail__region" htmlFor={selectId}>
      <span className="detail__kicker">{label}</span>
      <Select id={selectId} className="detail__select" value={value} onChange={onChange}>
        {children}
      </Select>
    </label>
  )
}

export function Rating({ rating, voteCount }) {
  return (
    <div className="detail__rating-block">
      <p className="detail__kicker">User rating</p>
      {rating ? (
        <p className="detail__rating">
          <span className="detail__rating-score">{rating.toFixed(1)}</span>
          <span className="detail__muted">/ 10 · {voteCount.toLocaleString('en-US')} ratings</span>
        </p>
      ) : (
        <p className="detail__muted">Not rated yet</p>
      )}
    </div>
  )
}

export function Section({ title, children, extra }) {
  return (
    <section className="detail__section">
      <div className="detail__section-head">
        <h2 className="detail__section-title">{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  )
}

export function Cast({ people, onOpen }) {
  if (!people?.length) return null
  return (
    <Section title="Cast">
      <ul className="detail__cast">
        {people.map((member) => (
          <li key={`${member.character}-${member.id}`}>
            <button
              type="button"
              className="detail__cast-card"
              onClick={() => onOpen({ mediaType: 'person', id: member.id })}
            >
              <MediaImage
                className="detail__cast-photo"
                path={member.profilePath}
                size="w185"
                sizes="7.5rem"
                alt={member.name}
                empty="No photo"
                lazy
              />
              <span className="detail__cast-name">{member.name}</span>
              {member.character && <span className="detail__muted">{member.character}</span>}
            </button>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export function Related({ title, items, onOpen, rows = false }) {
  if (!items?.length) return null
  return (
    <Section title={title}>
      <ResultGrid
        items={items}
        onSelect={onOpen}
        className={cn('detail__grid', rows && 'detail__grid--rows')}
      />
    </Section>
  )
}

