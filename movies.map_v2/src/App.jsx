import { useEffect, useLayoutEffect, useState } from 'react'
import './App.css'
import { clearSession, loadSession, saveSession } from './API/novi.js'
import AuthModal from './components/AuthModal.jsx'
import NavBar from './components/NavBar.jsx'
import Typewriter from './components/Typewriter.jsx'
import { WatchlistProvider } from './context/WatchlistContext.jsx'
import DetailPage from './pages/DetailPage.jsx'
import SearchResultsPage from './pages/SearchResultsPage.jsx'
import Randomizer from './pages/Randomizer.jsx'
import SearchSection from './pages/SearchSection.jsx'
import Watchlist from './pages/Watchlist.jsx'
import { scrollToSection } from './scrollToSection.js'

/** Pretend login flag. There is no account server — just 'true' in localStorage. */
function getStoredAuth() {
  return loadSession()
}

/** Last chosen theme, defaulting to dark if nothing (or anything else) is stored. */
function getStoredTheme() {
  return localStorage.getItem('theme') === 'light' ? 'light' : 'dark'
}

/** Paint CSS variables on <html> and remember the choice for the next visit. */
function applyTheme(theme) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme
  localStorage.setItem('theme', theme)
}

/**
 * Shell for the three snap pages plus the optional “See all” overlay.
 * No React Router: overlay open/close is a history.pushState / popstate pair.
 */
function App() {
  'use no memo'
  const [session, setSession] = useState(getStoredAuth)
  const [authOpen, setAuthOpen] = useState(false)
  const [theme, setTheme] = useState(getStoredTheme)
  const [resultsSearch, setResultsSearch] = useState(null)
  const [detail, setDetail] = useState(null)
  const [watchlistOpen, setWatchlistOpen] = useState(false)

  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  function handleToggleAuth() {
    if (session.isLoggedIn) {
      clearSession()
      setSession({ isLoggedIn: false, token: null, user: null })
      setWatchlistOpen(false)
      if (window.history.state?.watchlist) {
        const next = { ...window.history.state }
        delete next.watchlist
        window.history.replaceState(next, '')
      }
      return
    }
    setAuthOpen(true)
  }

  function handleAuthenticated(next) {
    saveSession(next)
    setSession({ isLoggedIn: true, token: next.token, user: next.user })
  }

  function handleToggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  /** Cover the snap pages with results and push a history entry so Back works. */
  function openResults(search) {
    setResultsSearch(search)
    window.history.pushState({ results: true }, '')
  }

  /** Prefer history.back() so popstate clears the overlay; otherwise hide it directly. */
  function closeResults() {
    if (window.history.state?.results) {
      window.history.back()
    } else {
      setResultsSearch(null)
    }
  }

  function openDetail(item) {
    if (!item?.id || !item.mediaType) return
    const next = { mediaType: item.mediaType, id: item.id }
    setDetail(next)
    window.history.pushState({ ...(window.history.state ?? {}), detail: next }, '')
  }

  function closeDetail() {
    if (window.history.state?.detail) {
      window.history.back()
    } else {
      setDetail(null)
    }
  }

  function openWatchlist() {
    if (!session.isLoggedIn) {
      setAuthOpen(true)
      return
    }
    setWatchlistOpen(true)
    if (!window.history.state?.watchlist) {
      window.history.pushState({ ...(window.history.state ?? {}), watchlist: true }, '')
    }
  }

  function closeWatchlist() {
    if (window.history.state?.watchlist) {
      window.history.back()
    } else {
      setWatchlistOpen(false)
    }
  }

  function dismissOverlays() {
    setResultsSearch(null)
    setDetail(null)
    setWatchlistOpen(false)
    const state = window.history.state
    if (state?.results || state?.detail || state?.watchlist) {
      window.history.replaceState({}, '')
    }
  }

  function handleFindTitle() {
    closeWatchlist()
    window.setTimeout(() => scrollToSection('search'), 0)
  }

  useEffect(() => {
    // Browser Back (and closeResults → history.back) lands here and hides the overlay.
    function onPopState() {
      const state = window.history.state
      setDetail(state?.detail ?? null)
      setWatchlistOpen(Boolean(state?.watchlist))
      if (!state?.results) setResultsSearch(null)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return (
    <WatchlistProvider userId={session.user?.id}>
      <div className="app" data-theme={theme}>
        <NavBar
          isLoggedIn={session.isLoggedIn}
          theme={theme}
          onToggleAuth={handleToggleAuth}
          onToggleTheme={handleToggleTheme}
          onNavigate={dismissOverlays}
          onOpenWatchlist={openWatchlist}
        />
        <main className="snap-container">
          <section id="home" className="snap-section snap-section-1">
            <Typewriter />
          </section>
          <section id="search" className="snap-section snap-section-2">
            <SearchSection onSeeAll={openResults} onSelect={openDetail} />
          </section>
          <section id="randomizer" className="snap-section snap-section-3">
            <Randomizer onSelect={openDetail} />
          </section>
        </main>
        {resultsSearch && (
          <SearchResultsPage search={resultsSearch} onBack={closeResults} onSelect={openDetail} />
        )}
        {watchlistOpen && session.isLoggedIn && (
          <Watchlist
            onBack={closeWatchlist}
            onSelect={openDetail}
            onFindTitle={handleFindTitle}
          />
        )}
        {detail && (
          <DetailPage
            key={`${detail.mediaType}-${detail.id}`}
            mediaType={detail.mediaType}
            id={detail.id}
            onBack={closeDetail}
            onOpen={openDetail}
            isLoggedIn={session.isLoggedIn}
            user={session.user}
            token={session.token}
            onRequestLogin={() => setAuthOpen(true)}
          />
        )}
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onAuthenticated={handleAuthenticated}
        />
      </div>
    </WatchlistProvider>
  )
}

export default App
