import { useEffect, useLayoutEffect, useState } from 'react'
import './App.css'
import NavBar from './components/NavBar.jsx'
import Typewriter from './components/Typewriter.jsx'
import DetailPage from './pages/DetailPage.jsx'
import SearchResultsPage from './pages/SearchResultsPage.jsx'
import SearchSection from './pages/SearchSection.jsx'

function getStoredAuth() {
  return localStorage.getItem('isLoggedIn') === 'true'
}

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
  const [isLoggedIn, setIsLoggedIn] = useState(getStoredAuth)
  const [theme, setTheme] = useState(getStoredTheme)
  const [resultsSearch, setResultsSearch] = useState(null)
  const [detail, setDetail] = useState(null)

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

  function openResults(search) {
    setResultsSearch(search)
    window.history.pushState({ results: true }, '')
  }

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

  useEffect(() => {
    function onPopState() {
      const state = window.history.state
      setDetail(state?.detail ?? null)
      if (!state?.results) setResultsSearch(null)
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
          <SearchSection onSeeAll={openResults} onSelect={openDetail} />
        </section>
        <section id="randomizer" className="snap-section snap-section-3">
          Random page
        </section>
      </main>
      {resultsSearch && (
        <SearchResultsPage search={resultsSearch} onBack={closeResults} onSelect={openDetail} />
      )}
      {detail && (
        <DetailPage
          key={`${detail.mediaType}-${detail.id}`}
          mediaType={detail.mediaType}
          id={detail.id}
          onBack={closeDetail}
          onOpen={openDetail}
          isLoggedIn={isLoggedIn}
          user={null}
          token={null}
          onRequestLogin={handleToggleAuth}
        />
      )}
    </div>
  )
}

export default App
