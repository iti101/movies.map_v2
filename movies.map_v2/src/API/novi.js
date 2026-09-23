/**
 * Novi student backend: login, signup, and reviews.
 * In plain English: this is the school account server. Watchlists are *not* here
 * (see watchlist.js). Dev traffic goes through Vite’s `/novi-api` proxy.
 */
const PROJECT_HEADER = 'novi-education-project-id'
const TOKEN_KEY = 'noviToken'
const USER_KEY = 'noviUser'
const LOGGED_IN_KEY = 'isLoggedIn'

/** Vite inlines VITE_* at startup — restart after editing `.env.local`. */
function getProjectId() {
  const projectId = import.meta.env.VITE_NOVI_PROJECT_ID
  if (!projectId) {
    throw new Error(
      'Missing NOVI project ID. Add VITE_NOVI_PROJECT_ID to .env.local and restart the dev server.',
    )
  }
  return projectId
}

/** Dev: same-origin proxy. Production: `VITE_NOVI_API_URL` or the hosted default. */
function getBaseUrl() {
  if (import.meta.env.DEV) return '/novi-api'
  return (
    import.meta.env.VITE_NOVI_API_URL ||
    'https://novi-backend-api-wgsgz.ondigitalocean.app'
  ).replace(/\/$/, '')
}

/** JSON + project header; Bearer token only when we have a session. */
function authHeaders(token) {
  const headers = {
    'Content-Type': 'application/json',
    [PROJECT_HEADER]: getProjectId(),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

/** Prefer Novi’s `detail`/`message`; otherwise a status-based fallback sentence. */
async function readErrorMessage(response) {
  const fallback =
    response.status === 401
      ? 'Invalid email or password.'
      : response.status === 400
        ? 'That account could not be created. The email may already be in use.'
        : response.status === 403
          ? 'You are not allowed to do that.'
          : 'Something went wrong. Please try again.'

  try {
    const data = await response.json()
    return data.detail || data.message || data.title || fallback
  } catch {
    return fallback
  }
}

/** Fetch helper: throw on non-OK, parse JSON, treat empty/204 as null. */
async function request(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: authHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  if (response.status === 204) return null

  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** Decode the middle part of a JWT. Garbage tokens return null. */
export function decodeTokenPayload(token) {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(normalized))
  } catch {
    return null
  }
}

/** True when the JWT exists and `exp` is still more than 5s away (missing `exp` counts as valid). */
export function isTokenValid(token) {
  const payload = decodeTokenPayload(token)
  if (!payload) return false
  if (!payload.exp) return true
  return payload.exp * 1000 > Date.now() + 5000
}

/** User id from a Novi user object or JWT (`id` / `userId` / `sub`). */
function readUserId(source) {
  const value = source?.id ?? source?.userId ?? source?.sub
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : value ?? null
}

/** Novi sometimes returns one object, sometimes `[profile]`. */
function firstItem(data) {
  if (!data) return null
  return Array.isArray(data) ? (data[0] ?? null) : data
}

/** Trimmed `username` or null — used for “your review” labels. */
function readUsername(source) {
  if (!source) return null
  if (typeof source.username === 'string' && source.username.trim()) {
    return source.username.trim()
  }
  return null
}

/** Restore token + user from localStorage, or log out if the JWT is missing/expired. */
export function loadSession() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token || !isTokenValid(token)) {
    clearSession()
    return { isLoggedIn: false, token: null, user: null }
  }

  let user = null
  try {
    user = JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    user = null
  }

  return { isLoggedIn: true, token, user }
}

/** Persist a successful login so a refresh stays signed in. */
export function saveSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user ?? null))
  localStorage.setItem(LOGGED_IN_KEY, 'true')
}

/** Drop the token; keep `isLoggedIn='false'` so older UI flags stay consistent. */
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.setItem(LOGGED_IN_KEY, 'false')
}

/** `POST /api/login`, then optionally attach a profile username. */
export async function login({ email, password }) {
  const data = await request('/api/login', {
    method: 'POST',
    body: { email, password },
  })

  const token = data?.token
  if (!token) {
    throw new Error('Login succeeded but no token was returned.')
  }

  const payload = decodeTokenPayload(token)
  const roles = data.user?.roles?.length
    ? data.user.roles
    : payload?.role
      ? [payload.role]
      : []
  const user = {
    email: data.user?.email ?? email,
    roles,
    id: readUserId(data.user) ?? readUserId(payload),
  }

  try {
    const profile = await getMyProfile(token, user.id)
    const username = readUsername(profile)
    if (username) user.username = username
  } catch {
    // Profile is extra data; login still succeeds without it.
  }

  return { token, user }
}

/** `POST /api/users` — used by signup, not the sign-in form. */
export async function createUser({ email, password, roles = ['user'] }) {
  return request('/api/users', {
    method: 'POST',
    body: { email, password, roles },
  })
}

/** Extra username row. Signup still works if this call fails. */
export async function createProfile({ userId, username, token }) {
  return request('/api/profiles', {
    method: 'POST',
    token,
    body: { userId, username },
  })
}

/** First profile for this user, or null. */
export async function getMyProfile(token, userId) {
  if (userId == null) return null
  const data = await request(`/api/users/${userId}/profiles`, { token })
  return firstItem(data)
}

/** Create user → log in → try to store the username profile. */
export async function createAccount({ username, email, password }) {
  const created = await createUser({ email, password, roles: ['user'] })
  const session = await login({ email, password })
  const userId = readUserId(created) ?? session.user.id

  if (username && userId != null) {
    try {
      const profile = await createProfile({ userId, username, token: session.token })
      return {
        token: session.token,
        user: {
          ...session.user,
          id: userId,
          username: readUsername(profile) ?? username,
        },
      }
    } catch {
      // Account auth still succeeds if the extra profile row cannot be stored.
    }
  }

  return {
    token: session.token,
    user: {
      ...session.user,
      id: userId,
      username,
    },
  }
}

/** Unwrap `{ content }` / `{ reviews }` / a bare array from Novi list endpoints. */
function asList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.reviews)) return data.reviews
  return []
}

/** Fetch every review, then keep this title’s rows, newest first. */
export async function getReviewsForMedia(mediaType, mediaId, token) {
  const list = asList(await request('/api/reviews', { token }))
  return list
    .filter(
      (review) => review.mediaType === mediaType && Number(review.mediaId) === Number(mediaId),
    )
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

/** `POST /api/reviews`. Omits empty text and a 0 rating so the body stays sparse. */
export async function createReview({ userId, mediaType, mediaId, text, rating }, token) {
  const body = {
    userId,
    mediaType,
    mediaId: Number(mediaId),
  }
  const trimmed = text?.trim()
  if (trimmed) body.text = trimmed
  if (rating > 0) body.rating = Number(rating)
  return request('/api/reviews', { method: 'POST', body, token })
}
