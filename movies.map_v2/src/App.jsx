import { useEffect, useLayoutEffect, useState } from 'react'
import './App.css'
import NavBar from './components/NavBar.jsx'
import Typewriter from './components/Typewriter.jsx'
import SearchResultsPage from './pages/SearchResultsPage.jsx'
import SearchSection from './pages/SearchSection.jsx'

/** Pretend login flag. There is no account server — just 'true' in localStorage. */
function getStoredAuth() {
  return localStorage.getItem('isLoggedIn') === 'true'
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
  const [isLoggedIn, setIsLoggedIn] = useState(getStoredAuth)
  const [theme, setTheme] = useState(getStoredTheme)
  const [resultsSearch, setResultsSearch] = useState(null)

  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  function handleToggleAuth() {
    setIsLoggedIn((current) => {
      const next = !current
      localStorage.setItem('isLoggedIn', String(next))
      return next
    })
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

  useEffect(() => {
    // Browser Back (and closeResults → history.back) lands here and hides the overlay.
    function onPopState() {
      setResultsSearch(null)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return (
    <div className="app" data-theme={theme}>
      <NavBar
        isLoggedIn={isLoggedIn}
        theme={theme}
        onToggleAuth={handleToggleAuth}
        onToggleTheme={handleToggleTheme}
        onNavigate={closeResults}
      />
      <main className="snap-container">
        <section id="home" className="snap-section snap-section-1">
          <Typewriter />
        </section>
        <section id="search" className="snap-section snap-section-2">
          <SearchSection onSeeAll={openResults} />
        </section>
        <section id="randomizer" className="snap-section snap-section-3">
          Random page
        </section>
      </main>
      {resultsSearch && (
        <SearchResultsPage search={resultsSearch} onBack={closeResults} />
      )}
    </div>
  )
}

export default App
