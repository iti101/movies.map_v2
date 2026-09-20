import { useState } from 'react'
import './App.css'
import NavBar from './components/NavBar.jsx'
import SearchSection from './SearchSection.jsx'

function getStoredAuth() {
  return localStorage.getItem('isLoggedIn') === 'true'
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(getStoredAuth)

  function handleToggleAuth() {
    setIsLoggedIn((current) => {
      const next = !current
      localStorage.setItem('isLoggedIn', String(next))
      return next
    })
  }

  return (
    <>
      <NavBar isLoggedIn={isLoggedIn} onToggleAuth={handleToggleAuth} />
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
    </>
  )
}

export default App
