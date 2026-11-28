import { useState } from 'react'
import { getTvSeason } from '../../API/tmdb.js'
import StatusCopy from '../../components/StatusCopy.jsx'
import { cn, formatDate, formatRuntime, pluralize } from '../../lib/format.js'
import { useAsync } from '../../hooks/useAsync.js'
import { useEscape } from '../../hooks/useEscape.js'
import { DetailSelect, Section } from './bits.jsx'

function defaultSeasonNumber(seasons) {
  if (!seasons.length) return null
  return seasons.find((season) => season.number >= 1)?.number ?? seasons[0].number
}

export default function SeasonEpisodes({ showId, seasons }) {
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
        <DetailSelect
          label="Season"
          value={seasonNumber ?? ''}
          onChange={(next) => {
            setSeasonNumber(Number(next))
            setOpenEpisodeId(null)
          }}
        >
          {seasons.map((season) => (
            <option key={season.number} value={season.number}>
              {season.name} · {pluralize(season.episodeCount, 'episode')}
            </option>
          ))}
        </DetailSelect>
      }
    >
      <StatusCopy
        status={status === 'success' && episodes.length === 0 ? 'empty' : status}
        error={error}
        loading="Loading episodes…"
        empty="No episodes listed for this season."
        className={status === 'error' ? 'detail__status' : 'detail__text'}
      />
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
                className={cn('detail__episode', isOpen && 'detail__episode--open')}
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
