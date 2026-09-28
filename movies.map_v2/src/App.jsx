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

/** Restore a Novi session from localStorage if the JWT is still valid. */
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
 * Shell for the three snap pages plus overlay screens (results, detail, watchlist).
 * No React Router: overlays are history.pushState / popstate flags.
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

  /** Logged in → sign out and close watchlist. Logged out → open the auth modal. */
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

  /** Store the Novi token/user after a successful sign-in or signup. */
  function handleAuthenticated(next) {
    saveSession(next)
    setSession({ isLoggedIn: true, token: next.token, user: next.user })
  }

  /** Flip dark ↔ light; `applyTheme` persists it on `<html>`. */
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

  /** Open a movie/TV/person page; keep any results/watchlist flags so Back returns there. */
  function openDetail(item) {
    if (!item?.id || !item.mediaType) return
    const next = { mediaType: item.mediaType, id: item.id }
    setDetail(next)
    window.history.pushState({ ...(window.history.state ?? {}), detail: next }, '')
  }

  /** Prefer history.back() so popstate hides the overlay; otherwise hide it directly. */
  function closeDetail() {
    if (window.history.state?.detail) {
      window.history.back()
    } else {
      setDetail(null)
    }
  }

  /** Watchlist overlay, or the login modal if there is no session. */
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

  /** Prefer history.back() so popstate hides watchlist; otherwise hide it directly. */
  function closeWatchlist() {
    if (window.history.state?.watchlist) {
      window.history.back()
    } else {
      setWatchlistOpen(false)
    }
  }

  /** Navbar section click: hide every overlay without adding another history entry. */
  function dismissOverlays() {
    setResultsSearch(null)
    setDetail(null)
    setWatchlistOpen(false)
    const state = window.history.state
    if (state?.results || state?.detail || state?.watchlist) {
      window.history.replaceState({}, '')
    }
  }

  /** Empty-list CTA: close watchlist, then snap-scroll to Search. */
  function handleFindTitle() {
    closeWatchlist()
    window.setTimeout(() => scrollToSection('search'), 0)
  }

  useEffect(() => {
    // Browser Back restores detail/watchlist flags; results only clear (they are not stored).
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
