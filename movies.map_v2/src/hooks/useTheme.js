import { useLayoutEffect, useState } from 'react'
import { readStorage, writeStorage } from '../lib/storage.js'

function getStoredTheme() {
  return readStorage('theme') === 'light' ? 'light' : 'dark'
}

function applyTheme(theme) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme
  writeStorage('theme', theme)
}

export function useTheme() {
  const [theme, setTheme] = useState(getStoredTheme)

  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggleTheme }
}
