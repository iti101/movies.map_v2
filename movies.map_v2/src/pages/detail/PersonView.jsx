import { formatDate } from '../../lib/format.js'
import { DetailHero, Facts, Related, Section } from './bits.jsx'

export default function PersonView({ person, onOpen }) {
  const facts = [
    person.birthday && { label: 'Born', value: formatDate(person.birthday) },
    person.deathday && { label: 'Died', value: formatDate(person.deathday) },
    person.placeOfBirth && { label: 'Place of birth', value: person.placeOfBirth },
  ].filter(Boolean)

  return (
    <>
      <DetailHero path={person.profilePath} alt={person.name} empty="No photo">
        <h1 id="detail-title" className="ui-display ui-display--page">{person.name}</h1>
        <Facts facts={facts} />
      </DetailHero>

      <Section title="Biography">
        <p className="detail__text detail__text--bio">
          {person.biography || 'No biography available yet.'}
        </p>
      </Section>
      <Related title="Known for" items={person.knownFor} onOpen={onOpen} />
    </>
  )
}
