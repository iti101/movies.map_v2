import MediaImage from '../../components/MediaImage.jsx'
import { formatDate } from '../../lib/format.js'
import { Facts, Related, Section } from './bits.jsx'

export default function PersonView({ person, onOpen }) {
  const facts = [
    person.birthday && { label: 'Born', value: formatDate(person.birthday) },
    person.deathday && { label: 'Died', value: formatDate(person.deathday) },
    person.placeOfBirth && { label: 'Place of birth', value: person.placeOfBirth },
  ].filter(Boolean)

  return (
    <>
      <header className="detail__header">
        <MediaImage
          className="detail__poster"
          path={person.profilePath}
          size="w500"
          alt={person.name}
          empty="No photo"
        />
        <div className="detail__intro">
          <h1 id="detail-title" className="detail__title">{person.name}</h1>
          <Facts facts={facts} />
        </div>
      </header>

      <Section title="Biography">
        <p className="detail__text detail__text--bio">
          {person.biography || 'No biography available yet.'}
        </p>
      </Section>
      <Related title="Known for" items={person.knownFor} onOpen={onOpen} />
    </>
  )
}
