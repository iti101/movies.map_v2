import { useLayoutEffect, useState } from 'react'
import './App.css'
import NavBar from './components/NavBar.jsx'
import SearchSection from './SearchSection.jsx'

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
    const current =
      document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
    const next = current === 'light' ? 'dark' : 'light'
    applyTheme(next)
    setTheme(next)
  }

  return (
    <div className="app" data-theme={theme}>
      <NavBar
        isLoggedIn={isLoggedIn}
        theme={theme}
        onToggleAuth={handleToggleAuth}
        onToggleTheme={handleToggleTheme}
      />
      <main className="snap-container">
        <section id="home" className="snap-section snap-section-1">
          Hero page
        </section>
        <section id="search" className="snap-section snap-section-2">
          <SearchSection />
        </section>
        <section id="randomizer" className="snap-section snap-section-3">
          Random page
        </section>
      </main>
    </div>
  )
}

export default App
