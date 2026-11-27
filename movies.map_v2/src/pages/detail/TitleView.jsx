import Button from '../../components/Button.jsx'
import WatchlistButton from '../../components/WatchlistButton.jsx'
import { formatDate, formatRuntime } from '../../lib/format.js'
import { uniqueBy } from '../../lib/list.js'
import { mediaKey } from '../../lib/media.js'
import { Cast, DetailHero, Facts, PeopleLinks, Rating, Related, Section } from './bits.jsx'
import Reviews from './Reviews.jsx'
import SeasonEpisodes from './SeasonEpisodes.jsx'
import WhereToWatch from './WhereToWatch.jsx'

export default function TitleView({ item, onOpen }) {
  const isTv = item.mediaType === 'tv'
  const date = formatDate(isTv ? item.firstAirDate : item.releaseDate)
  const talent = isTv ? (item.createdBy ?? []) : (item.directors ?? [])
  const runtime = isTv ? null : formatRuntime(item.runtime)
  const people = uniqueBy(
    [...(item.createdBy ?? []), ...(item.directors ?? []), ...(item.cast ?? [])].filter(
      (person) => person?.id,
    ),
    (person) => person.id,
  )
  const facts = [
    date && { label: isTv ? 'First aired' : 'Release date', value: date },
    talent.length > 0 && {
      label: isTv ? 'Created by' : talent.length > 1 ? 'Directors' : 'Director',
      value: <PeopleLinks people={talent} onOpen={onOpen} />,
    },
    runtime && { label: 'Runtime', value: runtime },
    item.genres.length > 0 && {
      label: item.genres.length > 1 ? 'Genres' : 'Genre',
      value: item.genres.join(', '),
    },
  ].filter(Boolean)

  return (
    <>
      <DetailHero path={item.posterPath} alt={`${item.title} poster`} empty="No poster">
        <h1 id="detail-title" className="ui-display ui-display--page">{item.title}</h1>
        {item.tagline && <p className="detail__tagline">{item.tagline}</p>}
        <Facts facts={facts} />
        <div className="detail__actions">
          <Rating rating={item.rating} voteCount={item.voteCount} />
          <div className="detail__cta">
            <WatchlistButton key={mediaKey(item)} item={item} />
            {item.trailerUrl ? (
              <Button
                className="detail__trailer"
                variant="accent"
                href={item.trailerUrl}
                target="_blank"
              >
                Watch Trailer
              </Button>
            ) : (
              <Button className="detail__trailer detail__trailer--disabled" variant="accent" disabled>
                No trailer yet
              </Button>
            )}
          </div>
        </div>
      </DetailHero>

      <Section title="Storyline">
        <p className="detail__text">{item.overview || 'No synopsis available yet.'}</p>
      </Section>
      <Cast people={people} onOpen={onOpen} />
      {isTv && <SeasonEpisodes showId={item.id} seasons={item.seasons ?? []} />}
      <WhereToWatch title={item.title} watchByRegion={item.watch} />
      <Reviews item={item} />
      <Related
        title={isTv ? 'Similar titles' : 'Similar movies'}
        items={item.similar}
        onOpen={onOpen}
        rows={isTv}
      />
    </>
  )
}
