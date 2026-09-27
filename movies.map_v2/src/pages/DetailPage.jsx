import { useEffect, useId, useState } from 'react'
import { createReview, getReviewsForMedia } from '../API/novi.js'
import {
  getFallbackWatchRegions,
  getImageUrl,
  getMovieDetails,
  getPersonDetails,
  getSavedWatchRegion,
  getTvDetails,
  getTvSeason,
  getWatchRegions,
  providerWatchUrl,
  saveWatchRegion,
  watchRegionName,
} from '../API/tmdb.js'
import { addToWatchlist, isInWatchlist } from '../API/watchlist.js'
import Button from '../components/Button.jsx'
import MovieCard from '../components/MovieCard.jsx'
import StarRating from '../components/StarRating.jsx'
import './DetailPage.css'

const LOADERS = {
  movie: getMovieDetails,
  tv: getTvDetails,
  person: getPersonDetails,
}

/** `2024-03-01` → `March 1, 2024` in en-US. Invalid values pass through. */
function formatDate(value) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** `125` → `2h 5m`. Falsy minutes → null. */
function formatRuntime(minutes) {
  if (!minutes) return null
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest}m`
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

/** Poster/profile image, or a placeholder span when TMDB has no path. */
function MediaImage({ path, size, alt, className, empty, lazy = false }) {
  const src = getImageUrl(path, size)
  if (!src) {
    return (
      <span className={`${className} ${className}--placeholder`} aria-hidden="true">
        {empty}
      </span>
    )
  }
  return <img className={className} src={src} alt={alt} loading={lazy ? 'lazy' : undefined} />
}

/** Label/value rows under the title (release date, runtime, genres…). */
function Facts({ facts }) {
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

/** TMDB audience score out of 10, or “Not rated yet”. */
function Rating({ rating, voteCount }) {
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

/** Titled block; `extra` is the right-side control (region/season select). */
function Section({ title, children, extra }) {
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

/** Cast row. A tap opens that person’s detail page. */
function Cast({ people, onOpen }) {
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

/** Similar / known-for posters. `rows` uses the denser TV grid. */
function Related({ title, items, onOpen, rows = false }) {
  if (!items?.length) return null
  return (
    <Section title={title}>
      <ul className={rows ? 'detail__grid detail__grid--rows' : 'detail__grid'}>
        {items.map((item) => (
          <MovieCard key={`${item.mediaType}-${item.id}`} item={item} onSelect={onOpen} />
        ))}
      </ul>
    </Section>
  )
}

/** Adds the title to lists[0]. Logged out → login modal. */
function WatchlistButton({ item, user, isLoggedIn, onRequestLogin }) {
  const [note, setNote] = useState('')
  const saved = isLoggedIn && isInWatchlist(user?.id, item)

  useEffect(() => {
    setNote('')
  }, [item.id])

  function handleClick() {
    if (!isLoggedIn || user?.id == null) {
      onRequestLogin()
      return
    }
    const result = addToWatchlist(user.id, {
      id: item.id,
      mediaType: item.mediaType,
      title: item.title,
      imagePath: item.posterPath,
      year: (item.releaseDate || item.firstAirDate)?.slice(0, 4) ?? null,
    })
    setNote(result === 'already' ? 'Already in your watchlist' : 'Added to your watchlist')
  }

  return (
    <div className="detail__watchlist">
      <Button variant="solid" onClick={handleClick}>
        {saved || note ? 'In watchlist' : 'Add to Watchlist'}
      </Button>
      {note && (
        <p className="detail__hint" role="status">
          {note}
        </p>
      )}
    </div>
  )
}

/** Streaming/rent/buy logos for one saved country (`localStorage.watchRegion`). */
function WhereToWatch({ title, watchByRegion }) {
  const labelId = useId()
  const [region, setRegion] = useState(getSavedWatchRegion)
  const [regions, setRegions] = useState(getFallbackWatchRegions)

  useEffect(() => {
    let cancelled = false
    getWatchRegions().then((options) => {
      if (!cancelled) setRegions(options)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const options = regions.some((option) => option.code === region)
    ? regions
    : [...regions, { code: region, name: watchRegionName(region) }].sort((a, b) =>
        a.name.localeCompare(b.name, 'en'),
      )
  const country = options.find((option) => option.code === region)?.name || region
  const watch = watchByRegion?.[region]
  const providers = watch?.providers ?? []

  function handleRegionChange(event) {
    const next = event.target.value
    setRegion(next)
    saveWatchRegion(next)
  }

  return (
    <Section
      title="Where to watch"
      extra={
        <label className="detail__region" htmlFor={labelId}>
          <span className="detail__kicker">Location</span>
          <select id={labelId} className="detail__select" value={region} onChange={handleRegionChange}>
            {options.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      }
    >
      {providers.length === 0 ? (
        <p className="detail__text">No streaming, rent, or buy options listed for {country}.</p>
      ) : (
        <>
          <ul className="detail__providers">
            {providers.map((provider) => {
              const href = providerWatchUrl(provider.name, title, watch?.link)
              const Tag = href ? 'a' : 'div'
              return (
                <li key={provider.id}>
                  <Tag
                    className="detail__provider"
                    {...(href ? { href, target: '_blank', rel: 'noreferrer' } : {})}
                  >
                    <MediaImage
                      className="detail__provider-logo"
                      path={provider.logoPath}
                      size="w92"
                      alt=""
                      empty={provider.name.slice(0, 1)}
                    />
                    <span className="detail__provider-copy">
                      <span className="detail__provider-name">{provider.name}</span>
                      <span className="detail__provider-offers">{provider.offers.join(' · ')}</span>
                    </span>
                  </Tag>
                </li>
              )
            })}
          </ul>
          <p className="detail__hint">Availability for {country}.</p>
        </>
      )}
    </Section>
  )
}

/** Novi reviews for this title. Write requires login; list fetch fails closed. */
function Reviews({ item, isLoggedIn, user, token, onRequestLogin }) {
  const fieldId = useId()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getReviewsForMedia(item.mediaType, item.id, token)
      .then((list) => {
        if (!cancelled) setReviews(list)
      })
      .catch(() => {
        if (!cancelled) setReviews([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [item.id, item.mediaType, token])

  function handleWrite() {
    if (!isLoggedIn || user?.id == null) {
      onRequestLogin()
      return
    }
    setOpen((current) => !current)
    setError('')
  }

  async function handlePublish() {
    const trimmed = text.trim()
    if (!rating && !trimmed) {
      setError('Add a star rating or write a short review.')
      return
    }
    if (!token || user?.id == null) {
      onRequestLogin()
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await createReview(
        {
          userId: user.id,
          mediaType: item.mediaType,
          mediaId: item.id,
          text: trimmed,
          rating,
        },
        token,
      )
      setReviews(await getReviewsForMedia(item.mediaType, item.id, token))
      setText('')
      setRating(0)
      setOpen(false)
    } catch (err) {
      setError(err.message || 'Could not publish your review.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Section title="Reviews">
      <div className="detail__review-compose">
        <Button variant="solid" onClick={handleWrite} aria-expanded={open}>
          Write a review
        </Button>
        {open && (
          <div className="detail__review-form">
            <StarRating value={rating} onChange={setRating} label="Your rating" />
            <label className="detail__kicker" htmlFor={fieldId}>
              Your review
            </label>
            <textarea
              id={fieldId}
              className="detail__review-text"
              rows={4}
              maxLength={2000}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What did you think?"
            />
            <Button variant="solid" onClick={handlePublish} disabled={submitting}>
              {submitting ? 'Publishing…' : 'Publish'}
            </Button>
          </div>
        )}
        {error && <p className="detail__status detail__status--error">{error}</p>}
      </div>

      {loading ? (
        <p className="detail__text">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="detail__text">No reviews yet.</p>
      ) : (
        <ul className="detail__reviews">
          {reviews.map((review) => {
            const isOwn = user?.id != null && Number(review.userId) === Number(user.id)
            const author = isOwn && user.username ? user.username : 'Member'
            const when = review.createdAt ? formatDate(review.createdAt) : null
            return (
              <li key={review.id ?? `${review.userId}-${review.createdAt}`} className="detail__review">
                <div className="detail__review-meta">
                  <span className="detail__cast-name">{author}</span>
                  {when && <span className="detail__muted">{when}</span>}
                </div>
                {Number(review.rating) > 0 && (
                  <StarRating
                    value={Number(review.rating)}
                    interactive={false}
                    label={`${review.rating} out of 5 stars`}
                  />
                )}
                {review.text && <p className="detail__text">{review.text}</p>}
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}

/** Prefer season 1+ so “Specials” (0) is not the default. */
function defaultSeasonNumber(seasons) {
  if (!seasons.length) return null
  return seasons.find((season) => season.number >= 1)?.number ?? seasons[0].number
}

/** Episode accordion for one season. Escape closes a synopsis, not the overlay. */
function SeasonEpisodes({ showId, seasons }) {
  const selectId = useId()
  const [seasonNumber, setSeasonNumber] = useState(() => defaultSeasonNumber(seasons))
  const [episodes, setEpisodes] = useState([])
  const [openEpisodeId, setOpenEpisodeId] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (seasonNumber == null) {
      setEpisodes([])
      setStatus('idle')
      return undefined
    }

    let cancelled = false
    setStatus('loading')
    setError('')
    setOpenEpisodeId(null)

    getTvSeason(showId, seasonNumber)
      .then((list) => {
        if (cancelled) return
        setEpisodes(list)
        setStatus('success')
      })
      .catch((err) => {
        if (cancelled) return
        setEpisodes([])
        setStatus('error')
        setError(err.message || 'Could not load episodes.')
      })

    return () => {
      cancelled = true
    }
  }, [showId, seasonNumber])

  useEffect(() => {
    if (openEpisodeId == null) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpenEpisodeId(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [openEpisodeId])

  if (!seasons.length) return null

  return (
    <Section
      title="Episodes"
      extra={
        <label className="detail__region" htmlFor={selectId}>
          <span className="detail__kicker">Season</span>
          <select
            id={selectId}
            className="detail__select"
            value={seasonNumber ?? ''}
            onChange={(event) => setSeasonNumber(Number(event.target.value))}
          >
            {seasons.map((season) => (
              <option key={season.number} value={season.number}>
                {season.name} · {season.episodeCount}{' '}
                {season.episodeCount === 1 ? 'episode' : 'episodes'}
              </option>
            ))}
          </select>
        </label>
      }
    >
      {status === 'loading' && <p className="detail__text">Loading episodes…</p>}
      {status === 'error' && <p className="detail__status detail__status--error">{error}</p>}
      {status === 'success' && episodes.length === 0 && (
        <p className="detail__text">No episodes listed for this season.</p>
      )}
      {status === 'success' && episodes.length > 0 && (
        <ol className="detail__episodes">
          {episodes.map((episode) => {
            const aired = formatDate(episode.airDate)
            const runtime = formatRuntime(episode.runtime)
            const meta = [aired, runtime].filter(Boolean).join(' · ')
            const isOpen = openEpisodeId === episode.id

            return (
              <li
                key={episode.id}
                className={`detail__episode${isOpen ? ' detail__episode--open' : ''}`}
              >
                <button
                  type="button"
                  className="detail__episode-toggle"
                  aria-expanded={isOpen}
                  onClick={() => setOpenEpisodeId(isOpen ? null : episode.id)}
                >
                  <span className="detail__episode-number">E{episode.number}</span>
                  <span className="detail__episode-name">{episode.name}</span>
                  {meta && <span className="detail__episode-meta">{meta}</span>}
                </button>
                {isOpen && (
                  <p className="detail__episode-overview">
                    {episode.overview || 'No synopsis available yet.'}
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </Section>
  )
}

/** Drop duplicate people (TV directors are prepended onto the cast list). */
function credits(people) {
  const seen = new Set()
  return people.filter((person) => {
    if (!person?.id || seen.has(person.id)) return false
    seen.add(person.id)
    return true
  })
}

/** TV layout: episodes + a longer similar row. Directors are mixed into Cast. */
function TvView({ item, onOpen, isLoggedIn, user, token, onRequestLogin }) {
  const date = formatDate(item.firstAirDate)
  const facts = [
    date && { label: 'First aired', value: date },
    item.genres.length > 0 && {
      label: item.genres.length > 1 ? 'Genres' : 'Genre',
      value: item.genres.join(', '),
    },
    item.createdBy.length > 0 && { label: 'Created by', value: item.createdBy.join(', ') },
  ].filter(Boolean)
  const people = credits([...(item.directors ?? []), ...item.cast])

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
          <h1 className="detail__title">{item.title}</h1>
          <Facts facts={facts} />
          <div className="detail__actions">
            <Rating rating={item.rating} voteCount={item.voteCount} />
            <div className="detail__cta">
              <WatchlistButton
                item={item}
                user={user}
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
      <SeasonEpisodes showId={item.id} seasons={item.seasons ?? []} />
      <WhereToWatch title={item.title} watchByRegion={item.watch} />
      <Reviews
        item={item}
        isLoggedIn={isLoggedIn}
        user={user}
        token={token}
        onRequestLogin={onRequestLogin}
      />
      <Related title="Similar titles" items={item.similar} onOpen={onOpen} rows />
    </>
  )
}

/** Movie layout: tagline, runtime, similar movies (not the TV episode list). */
function TitleView({ item, onOpen, isLoggedIn, user, token, onRequestLogin }) {
  const date = formatDate(item.releaseDate)
  const directors = item.directors ?? []
  const runtime = formatRuntime(item.runtime)
  const facts = [
    date && { label: 'Release date', value: date },
    directors.length > 0 && {
      label: directors.length > 1 ? 'Directors' : 'Director',
      value: directors.join(', '),
    },
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
          <h1 className="detail__title">{item.title}</h1>
          {item.tagline && <p className="detail__tagline">{item.tagline}</p>}
          <Facts facts={facts} />
          <div className="detail__actions">
            <Rating rating={item.rating} voteCount={item.voteCount} />
            <div className="detail__cta">
              <WatchlistButton
                item={item}
                user={user}
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
      <Cast people={item.cast} onOpen={onOpen} />
      <WhereToWatch title={item.title} watchByRegion={item.watch} />
      <Reviews
        item={item}
        isLoggedIn={isLoggedIn}
        user={user}
        token={token}
        onRequestLogin={onRequestLogin}
      />
      <Related title="Similar movies" items={item.similar} onOpen={onOpen} />
    </>
  )
}

/** Person layout: bio + known-for. No watchlist, trailer, or reviews. */
function PersonView({ person, onOpen }) {
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
          <h1 className="detail__title">{person.name}</h1>
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

/**
 * Overlay for one TMDB id. `mediaType` picks movie / TV / person loaders.
 * Nested opens (cast, similar) remount via App’s `key`.
 */
function DetailPage({ mediaType, id, onBack, onOpen, isLoggedIn, user, token, onRequestLogin }) {
  const [item, setItem] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const scroller = document.querySelector('.detail')
    scroller?.scrollTo(0, 0)

    const load = LOADERS[mediaType]
    if (!load) {
      setStatus('error')
      setError('Unknown title type.')
      return undefined
    }

    let cancelled = false
    setStatus('loading')
    setItem(null)
    setError('')

    load(id)
      .then((data) => {
        if (cancelled) return
        setItem(data)
        setStatus('success')
      })
      .catch((err) => {
        if (cancelled) return
        setStatus('error')
        setError(err.message || 'Could not load this page.')
      })

    return () => {
      cancelled = true
    }
  }, [mediaType, id])

  const backdropUrl = getImageUrl(item?.backdropPath, 'w1280')

  return (
    <article className="detail">
      {backdropUrl && (
        <div
          className="detail__backdrop"
          style={{ backgroundImage: `url(${backdropUrl})` }}
          aria-hidden="true"
        />
      )}

      <div className="detail__content">
        <Button className="detail__back" onClick={onBack}>
          Back
        </Button>

        {status === 'loading' && <p className="detail__status">Loading…</p>}
        {status === 'error' && <p className="detail__status detail__status--error">{error}</p>}
        {item && mediaType === 'person' && <PersonView person={item} onOpen={onOpen} />}
        {item && mediaType === 'tv' && (
          <TvView
            item={item}
            onOpen={onOpen}
            isLoggedIn={isLoggedIn}
            user={user}
            token={token}
            onRequestLogin={onRequestLogin}
          />
        )}
        {item && mediaType === 'movie' && (
          <TitleView
            item={item}
            onOpen={onOpen}
            isLoggedIn={isLoggedIn}
            user={user}
            token={token}
            onRequestLogin={onRequestLogin}
          />
        )}
      </div>
    </article>
  )
}

export default DetailPage
