import { lazy, Suspense } from 'react'
import { mediaKey } from '../lib/media.js'
import ErrorBoundary from './ErrorBoundary.jsx'

const DetailPage = lazy(() => import('../pages/DetailPage.jsx'))
const SearchResultsPage = lazy(() => import('../pages/SearchResultsPage.jsx'))
const Watchlist = lazy(() => import('../pages/Watchlist.jsx'))

export default function AppOverlays({
  overlays,
  watchlistVisible,
  topOverlay,
  onFindTitle,
}) {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        {overlays.resultsSearch && (
          <SearchResultsPage
            search={overlays.resultsSearch}
            active={topOverlay === 'results'}
            onBack={overlays.closeResults}
            onSelect={overlays.openDetail}
          />
        )}
        {watchlistVisible && (
          <Watchlist
            active={topOverlay === 'watchlist'}
            onBack={overlays.closeWatchlist}
            onSelect={overlays.openDetail}
            onFindTitle={onFindTitle}
          />
        )}
        {overlays.detail && (
          <DetailPage
            key={mediaKey(overlays.detail)}
            mediaType={overlays.detail.mediaType}
            id={overlays.detail.id}
            active={topOverlay === 'detail'}
            onBack={overlays.closeDetail}
            onOpen={overlays.openDetail}
          />
        )}
      </Suspense>
    </ErrorBoundary>
  )
}
