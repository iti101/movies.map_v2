import { useCallback } from 'react'
import './App.css'
import AppOverlays from './components/AppOverlays.jsx'
import NavBar from './components/NavBar.jsx'
import Typewriter from './components/Typewriter.jsx'
import { SessionProvider } from './context/SessionContext.jsx'
import { WatchlistProvider } from './context/WatchlistContext.jsx'
import { useSession } from './context/session-context.js'
import { useOverlayHistory } from './hooks/useOverlayHistory.js'
import { useSearchHotkey } from './hooks/useSearchHotkey.js'
import { useTheme } from './hooks/useTheme.js'
import { scrollToSection } from './lib/scroll.js'
import Randomizer from './pages/Randomizer.jsx'
import SearchSection from './pages/SearchSection.jsx'

function AppShell() {
  'use no memo'
  const { isLoggedIn, user, openAuth } = useSession()
  const { theme, toggleTheme } = useTheme()
  const overlays = useOverlayHistory()
  const dismissOverlays = overlays.dismissOverlays
  const watchlistVisible = overlays.watchlistOpen && isLoggedIn
  const overlayOpen = Boolean(overlays.resultsSearch || overlays.detail || watchlistVisible)
  const topOverlay = overlays.detail
    ? 'detail'
    : watchlistVisible
      ? 'watchlist'
      : overlays.resultsSearch
        ? 'results'
        : null

  const goToSearch = useCallback(() => {
    dismissOverlays()
    scrollToSection('search')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => document.querySelector('.search-input')?.focus())
    })
  }, [dismissOverlays])

  useSearchHotkey(goToSearch)

  function handleOpenWatchlist() {
    if (!isLoggedIn) {
      openAuth()
      return
    }
    overlays.openWatchlist()
  }

  function handleFindTitle() {
    overlays.closeWatchlist()
    window.setTimeout(() => scrollToSection('search'), 0)
  }

  return (
    <WatchlistProvider userId={user?.id}>
      <div className="app">
        <a className="skip-link" href="#search">
          Skip to search
        </a>
        <NavBar
          theme={theme}
          onToggleTheme={toggleTheme}
          onNavigate={dismissOverlays}
          onOpenWatchlist={handleOpenWatchlist}
          onLogout={overlays.clearWatchlistHistory}
        />
        <main className="snap-container" inert={overlayOpen || undefined}>
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
        <AppOverlays
          overlays={overlays}
          watchlistVisible={watchlistVisible}
          topOverlay={topOverlay}
          onFindTitle={handleFindTitle}
        />
      </div>
    </WatchlistProvider>
  )
}

function App() {
  return (
    <SessionProvider>
      <AppShell />
    </SessionProvider>
  )
}

export default App
