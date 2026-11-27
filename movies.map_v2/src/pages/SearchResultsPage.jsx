import OverlayPage from '../components/OverlayPage.jsx'
import ResultGrid from '../components/ResultGrid.jsx'
import SearchStatus from '../components/SearchStatus.jsx'
import { useSeeAllResults } from './search/useSeeAllResults.js'
import './SearchResultsPage.css'

/** Full-screen “See all” overlay. Seed-then-fill lives in useSeeAllResults. */
function SearchResultsPage({ search, active, onBack, onSelect }) {
  const {
    status,
    error,
    results,
    suggestion,
    label,
    summary,
    acceptSuggestion,
  } = useSeeAllResults(search)

  return (
    <OverlayPage
      className="results-page"
      contentClass="results-page__inner"
      active={active}
      onBack={onBack}
      labelledBy="results-title"
    >
      <header className="results-page__header">
        <h1 id="results-title" className="ui-display ui-display--feature">
          Results
        </h1>
        <p className="results-page__query">{summary}</p>
      </header>

      <SearchStatus
        status={status}
        error={error}
        label={label}
        suggestion={suggestion}
        onAcceptSuggestion={acceptSuggestion}
      />

      {results.length > 0 && (
        <ResultGrid items={results} onSelect={onSelect} className="poster-grid--wide" />
      )}
    </OverlayPage>
  )
}

export default SearchResultsPage
