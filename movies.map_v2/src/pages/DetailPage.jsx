import { useEffect } from 'react'
import { DETAIL_LOADERS, getImageUrl } from '../API/tmdb.js'
import OverlayPage from '../components/OverlayPage.jsx'
import { useAsync } from '../hooks/useAsync.js'
import PersonView from './detail/PersonView.jsx'
import TitleView from './detail/TitleView.jsx'
import './DetailPage.css'

function DetailPage({ mediaType, id, onBack, onOpen, isLoggedIn, user, token, onRequestLogin }) {
  const loader = DETAIL_LOADERS[mediaType]
  const { status, data: item, error } = useAsync((signal) => {
    if (!loader) throw new Error('Unknown title type.')
    return loader(id, { signal })
  }, [mediaType, id])

  useEffect(() => {
    document.querySelector('.detail')?.scrollTo(0, 0)
  }, [mediaType, id])

  const backdropUrl = getImageUrl(item?.backdropPath, 'w1280')

  return (
    <OverlayPage
      className="detail"
      contentClass="detail__content"
      backClass="detail__back"
      onBack={onBack}
      labelledBy="detail-title"
      before={
        backdropUrl ? (
          <div
            className="detail__backdrop"
            style={{ backgroundImage: `url(${backdropUrl})` }}
            aria-hidden="true"
          />
        ) : null
      }
    >
      {status === 'loading' && <p className="detail__status">Loading…</p>}
      {status === 'error' && <p className="detail__status detail__status--error">{error}</p>}
      {item && mediaType === 'person' && <PersonView person={item} onOpen={onOpen} />}
      {item && mediaType !== 'person' && (
        <TitleView
          item={item}
          onOpen={onOpen}
          isLoggedIn={isLoggedIn}
          user={user}
          token={token}
          onRequestLogin={onRequestLogin}
        />
      )}
    </OverlayPage>
  )
}

export default DetailPage
