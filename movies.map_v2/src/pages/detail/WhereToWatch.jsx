import { useId, useState } from 'react'
import {
  getFallbackWatchRegions,
  getSavedWatchRegion,
  getWatchRegions,
  providerWatchUrl,
  saveWatchRegion,
  watchRegionName,
} from '../../API/tmdb.js'
import MediaImage from '../../components/MediaImage.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import { Section } from './bits.jsx'

export default function WhereToWatch({ title, watchByRegion }) {
  const labelId = useId()
  const [region, setRegion] = useState(getSavedWatchRegion)
  const { data } = useAsync((signal) => getWatchRegions({ signal }), [])
  const regions = data ?? getFallbackWatchRegions()

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
          <select
            id={labelId}
            className="detail__select"
            value={region}
            onChange={handleRegionChange}
          >
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
