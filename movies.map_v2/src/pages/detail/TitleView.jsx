import MediaImage from '../../components/MediaImage.jsx'
import WatchlistButton from '../../components/WatchlistButton.jsx'
import { formatDate, formatRuntime } from '../../lib/format.js'
import { Cast, Facts, Rating, Related, Section } from './bits.jsx'

function uniquePeople(people) {
  const seen = new Set()
  return people.filter((person) => {
    if (!person?.id || seen.has(person.id)) return false
    seen.add(person.id)
    return true
  })
}
import Reviews from './Reviews.jsx'
import SeasonEpisodes from './SeasonEpisodes.jsx'
import WhereToWatch from './WhereToWatch.jsx'

export default function TitleView({ item, onOpen, isLoggedIn, user, token, onRequestLogin }) {
  const isTv = item.mediaType === 'tv'
  const date = formatDate(isTv ? item.firstAirDate : item.releaseDate)
  const creators = isTv ? item.createdBy : (item.directors ?? [])
  const runtime = isTv ? null : formatRuntime(item.runtime)
  const people = isTv ? uniquePeople([...(item.directors ?? []), ...item.cast]) : item.cast
  const facts = [
    date && { label: isTv ? 'First aired' : 'Release date', value: date },
    !isTv &&
      creators.length > 0 && {
        label: creators.length > 1 ? 'Directors' : 'Director',
        value: creators.join(', '),
      },
    isTv && creators.length > 0 && { label: 'Created by', value: creators.join(', ') },
    runtime && { label: 'Runtime', value: runtime },
    item.genres.length > 0 && {
      label: item.genres.length > 1 ? 'Genres' : 'Genre',
      value: item.genres.join(', '),
    },
  ].filter(Boolean)

  return (
    <>
      <header className="detail__header">
        <MediaImage
          className="detail__poster"
          path={item.posterPath}
          size="w500"
          alt={`${item.title} poster`}
          empty="No poster"
        />
        <div className="detail__intro">
          <h1 id="detail-title" className="detail__title">{item.title}</h1>
          {item.tagline && <p className="detail__tagline">{item.tagline}</p>}
          <Facts facts={facts} />
          <div className="detail__actions">
            <Rating rating={item.rating} voteCount={item.voteCount} />
            <div className="detail__cta">
              <WatchlistButton
                key={`${item.mediaType}-${item.id}`}
                item={item}
                isLoggedIn={isLoggedIn}
                onRequestLogin={onRequestLogin}
              />
              {item.trailerUrl ? (
                <a className="detail__trailer" href={item.trailerUrl} target="_blank" rel="noreferrer">
                  Watch Trailer
                </a>
              ) : (
                <span className="detail__trailer detail__trailer--disabled">No trailer yet</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <Section title="Storyline">
        <p className="detail__text">{item.overview || 'No synopsis available yet.'}</p>
      </Section>
      <Cast people={people} onOpen={onOpen} />
      {isTv && <SeasonEpisodes showId={item.id} seasons={item.seasons ?? []} />}
      <WhereToWatch title={item.title} watchByRegion={item.watch} />
      <Reviews
        item={item}
        isLoggedIn={isLoggedIn}
        user={user}
        token={token}
        onRequestLogin={onRequestLogin}
      />
      <Related
        title={isTv ? 'Similar titles' : 'Similar movies'}
        items={item.similar}
        onOpen={onOpen}
        rows={isTv}
      />
    </>
  )
}
