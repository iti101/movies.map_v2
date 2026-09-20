import { useEffect, useState } from 'react'
import './NavBar.css'
import loginIcon from '../assets/login_opsz24.svg'
import logoutIcon from '../assets/logout_opsz24.svg'

function NavBar({ isLoggedIn, onToggleAuth }) {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function closeMenu() {
    setMenuOpen(false)
  }

  function goTo(sectionId) {
    closeMenu()
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    }, 0)
  }

  function handleAuthMenuClick() {
    if (!isLoggedIn) {
      onToggleAuth()
    }
    closeMenu()
  }

  return (
    <>
      <header className="navbar">
        <button
          className={`navbar-hamburger${menuOpen ? ' is-open' : ''}`}
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="main-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="navbar-hamburger-bar navbar-hamburger-bar-1" />
          <span className="navbar-hamburger-bar navbar-hamburger-bar-2" />
          <span className="navbar-hamburger-bar navbar-hamburger-bar-3" />
        </button>

        <button
          className="navbar-auth"
          type="button"
          onClick={onToggleAuth}
          aria-label={isLoggedIn ? 'Log out' : 'Log in'}
        >
          <img
            src={isLoggedIn ? logoutIcon : loginIcon}
            alt=""
            className="navbar-auth-icon"
          />
        </button>
      </header>

      <nav
        id="main-menu"
        className={`navbar-menu${menuOpen ? ' is-open' : ''}`}
        aria-label="Main"
        hidden={!menuOpen}
      >
        <button type="button" onClick={() => goTo('home')}>
          Home
        </button>
        <button type="button" onClick={() => goTo('search')}>
          Search
        </button>
        <button type="button" onClick={() => goTo('randomizer')}>
          Randomizer
        </button>
        <button type="button" onClick={handleAuthMenuClick}>
          {isLoggedIn ? 'My Watchlist' : 'Log-in / Sign-up'}
        </button>
      </nav>
    </>
  )
}

export default NavBar
