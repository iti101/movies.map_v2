import { useEffect, useState } from 'react'
import Button from './Button.jsx'
import './NavBar.css'
import loginIcon from '../assets/login_opsz24.svg'
import logoutIcon from '../assets/logout_opsz24.svg'
import lightModeIcon from '../assets/light_mode_opsz24.svg'
import darkModeIcon from '../assets/dark_mode_opsz24.svg'

const MENU_SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'search', label: 'Search' },
  { id: 'randomizer', label: 'Randomizer' },
]

/**
 * Fixed top bar: hamburger overlay menu, theme toggle, and pretend login.
 * Menu links scroll to snap sections; onNavigate also closes the results overlay.
 */
function NavBar({ isLoggedIn, theme, onToggleAuth, onToggleTheme, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const isDark = theme === 'dark'
  const themeLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode'
  const themeIcon = isDark ? lightModeIcon : darkModeIcon
  const authLabel = isLoggedIn ? 'Log out' : 'Log in'
  const authIcon = isLoggedIn ? logoutIcon : loginIcon

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function closeMenu() {
    setMenuOpen(false)
  }

  function goTo(sectionId) {
    closeMenu()
    onNavigate?.(sectionId)
    // Defer scroll so the overlay unmounts first
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    }, 0)
  }

  /** Logged out: menu item logs you in. Logged in: “My Watchlist” only closes the menu. */
  function handleAuthMenuClick() {
    if (!isLoggedIn) onToggleAuth()
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

        <div className="navbar-actions">
          <Button
            variant="icon"
            className="navbar-theme"
            onClick={onToggleTheme}
            aria-pressed={isDark}
            aria-label={themeLabel}
            title={themeLabel}
          >
            <img src={themeIcon} alt="" className="navbar-icon" />
          </Button>

          <Button
            variant="icon"
            className="navbar-auth"
            onClick={onToggleAuth}
            aria-label={authLabel}
          >
            <img src={authIcon} alt="" className="navbar-icon" />
          </Button>
        </div>
      </header>

      <nav
        id="main-menu"
        className={`navbar-menu${menuOpen ? ' is-open' : ''}`}
        aria-label="Main"
        hidden={!menuOpen}
      >
        {MENU_SECTIONS.map(({ id, label }) => (
          <Button key={id} variant="ghost" size="xl" onClick={() => goTo(id)}>
            {label}
          </Button>
        ))}
        <Button variant="ghost" size="xl" onClick={handleAuthMenuClick}>
          {isLoggedIn ? 'My Watchlist' : 'Log-in / Sign-up'}
        </Button>
      </nav>
    </>
  )
}

export default NavBar
