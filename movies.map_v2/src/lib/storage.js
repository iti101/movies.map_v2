function canUseStorage() {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

export function readStorage(key) {
  if (!canUseStorage()) return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key, value) {
  if (!canUseStorage()) return false
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function removeStorage(key) {
  if (!canUseStorage()) return
  try {
    localStorage.removeItem(key)
  } catch {
    // Private mode and quota errors should not crash the app.
  }
}

export function readJson(key, fallback) {
  const raw = readStorage(key)
  if (raw == null) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeJson(key, value) {
  return writeStorage(key, JSON.stringify(value))
}
