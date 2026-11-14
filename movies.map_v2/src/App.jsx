import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react'
import './App.css'
import { clearSession, loadSession, saveSession } from './API/novi.js'
import AuthModal from './components/AuthModal.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import NavBar from './components/NavBar.jsx'
import Typewriter from './components/Typewriter.jsx'
import { WatchlistProvider } from './context/WatchlistContext.jsx'
import { useOverlayHistory } from './hooks/useOverlayHistory.js'
import Randomizer from './pages/Randomizer.jsx'
import SearchSection from './pages/SearchSection.jsx'
import { scrollToSection } from './scrollToSection.js'

const DetailPage = lazy(() => import('./pages/DetailPage.jsx'))
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage.jsx'))
const Watchlist = lazy(() => import('./pages/Watchlist.jsx'))

function getStoredTheme() {
  return localStorage.getItem('theme') === 'light' ? 'light' : 'dark'
}

function applyTheme(theme) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme
  localStorage.setItem('theme', theme)
}

function App() {
  'use no memo'
  const [session, setSession] = useState(loadSession)
  const [authOpen, setAuthOpen] = useState(false)
  const [theme, setTheme] = useState(getStoredTheme)
  const overlays = useOverlayHistory()
  const dismissOverlays = overlays.dismissOverlays

  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const tag = event.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable) return
      event.preventDefault()
      dismissOverlays()
      scrollToSection('search')
      window.setTimeout(() => document.querySelector('.search-input')?.focus(), 320)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dismissOverlays])

  function handleToggleAuth() {
    if (session.isLoggedIn) {
      clearSession()
      setSession({ isLoggedIn: false, token: null, user: null })
      overlays.clearWatchlistHistory()
      return
    }
    setAuthOpen(true)
  }

  function handleAuthenticated(next) {
    saveSession(next)
    setSession({ isLoggedIn: true, token: next.token, user: next.user })
  }

  function handleOpenWatchlist() {
    if (!session.isLoggedIn) {
      setAuthOpen(true)
      return
    }
    overlays.openWatchlist()
  }

  function handleFindTitle() {
    overlays.closeWatchlist()
    window.setTimeout(() => scrollToSection('search'), 0)
  }

  return (
    <WatchlistProvider userId={session.user?.id}>
      <div className="app" data-theme={theme}>
        <a className="skip-link" href="#search">
          Skip to search
        </a>
        <NavBar
          isLoggedIn={session.isLoggedIn}
          theme={theme}
          onToggleAuth={handleToggleAuth}
          onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          onNavigate={overlays.dismissOverlays}
          onOpenWatchlist={handleOpenWatchlist}
        />
        <main className="snap-container" inert={overlays.overlayOpen || undefined}>
          <section id="home" className="snap-section snap-section-1">
            <Typewriter />
          </section>
          <section id="search" className="snap-section snap-section-2">
            <SearchSection onSeeAll={overlays.openResults} onSelect={overlays.openDetail} />
          </section>
          <section id="randomizer" className="snap-section snap-section-3">
            <Randomizer onSelect={overlays.openDetail} />
          </section>
        </main>
        <ErrorBoundary>
          <Suspense fallback={null}>
            {overlays.resultsSearch && (
              <SearchResultsPage
                search={overlays.resultsSearch}
                onBack={overlays.closeResults}
                onSelect={overlays.openDetail}
              />
            )}
            {overlays.watchlistOpen && session.isLoggedIn && (
              <Watchlist
                onBack={overlays.closeWatchlist}
                onSelect={overlays.openDetail}
                onFindTitle={handleFindTitle}
              />
            )}
            {overlays.detail && (
              <DetailPage
                key={`${overlays.detail.mediaType}-${overlays.detail.id}`}
                mediaType={overlays.detail.mediaType}
                id={overlays.detail.id}
                onBack={overlays.closeDetail}
                onOpen={overlays.openDetail}
                isLoggedIn={session.isLoggedIn}
                user={session.user}
                token={session.token}
                onRequestLogin={() => setAuthOpen(true)}
              />
            )}
          </Suspense>
        </ErrorBoundary>
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
