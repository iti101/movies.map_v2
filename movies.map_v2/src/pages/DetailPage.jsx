import { DETAIL_LOADERS, getImageUrl } from '../API/tmdb.js'
import OverlayPage from '../components/OverlayPage.jsx'
import StatusCopy from '../components/StatusCopy.jsx'
import { useAsync } from '../hooks/useAsync.js'
import PersonView from './detail/PersonView.jsx'
import TitleView from './detail/TitleView.jsx'
import './DetailPage.css'

function DetailPage({ mediaType, id, active, onBack, onOpen }) {
  const loader = DETAIL_LOADERS[mediaType]
  const { status, data: item, error } = useAsync((signal) => {
    if (!loader) throw new Error('Unknown title type.')
    return loader(id, { signal })
  }, [mediaType, id])

  const backdropUrl = getImageUrl(item?.backdropPath, 'w1280')

  return (
    <OverlayPage
      className="detail"
      contentClass="detail__content"
      active={active}
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
      <StatusCopy status={status} error={error} className="detail__status" />
      {item && mediaType === 'person' && <PersonView person={item} onOpen={onOpen} />}
      {item && mediaType !== 'person' && <TitleView item={item} onOpen={onOpen} />}
    </OverlayPage>
  )
}

export default DetailPage
