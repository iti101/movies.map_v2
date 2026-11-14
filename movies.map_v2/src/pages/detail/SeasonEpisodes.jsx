import { useId, useState } from 'react'
import { getTvSeason } from '../../API/tmdb.js'
import { formatDate, formatRuntime } from '../../lib/format.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useEscape } from '../../hooks/useEscape.js'
import { Section } from './bits.jsx'

function defaultSeasonNumber(seasons) {
  if (!seasons.length) return null
  return seasons.find((season) => season.number >= 1)?.number ?? seasons[0].number
}

export default function SeasonEpisodes({ showId, seasons }) {
  const selectId = useId()
  const [seasonNumber, setSeasonNumber] = useState(() => defaultSeasonNumber(seasons))
  const [openEpisodeId, setOpenEpisodeId] = useState(null)
  const { status, data, error } = useAsync((signal) => {
    if (seasonNumber == null) return []
    return getTvSeason(showId, seasonNumber, { signal })
  }, [showId, seasonNumber])
  const episodes = data ?? []

  useEscape(openEpisodeId != null, () => setOpenEpisodeId(null))

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
            onChange={(event) => {
              setSeasonNumber(Number(event.target.value))
              setOpenEpisodeId(null)
            }}
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
