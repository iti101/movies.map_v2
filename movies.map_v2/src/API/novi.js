const PROJECT_HEADER = 'novi-education-project-id'
const TOKEN_KEY = 'noviToken'
const USER_KEY = 'noviUser'
const LOGGED_IN_KEY = 'isLoggedIn'

function getProjectId() {
  const projectId = import.meta.env.VITE_NOVI_PROJECT_ID
  if (!projectId) {
    throw new Error(
      'Missing NOVI project ID. Add VITE_NOVI_PROJECT_ID to .env.local and restart the dev server.',
    )
  }
  return projectId
}

function getBaseUrl() {
  if (import.meta.env.DEV) return '/novi-api'
  return (
    import.meta.env.VITE_NOVI_API_URL ||
    'https://novi-backend-api-wgsgz.ondigitalocean.app'
  ).replace(/\/$/, '')
}

function authHeaders(token) {
  const headers = {
    'Content-Type': 'application/json',
    [PROJECT_HEADER]: getProjectId(),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

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

export function isTokenValid(token) {
  const payload = decodeTokenPayload(token)
  if (!payload) return false
  if (!payload.exp) return true
  return payload.exp * 1000 > Date.now() + 5000
}

function readUserId(source) {
  const value = source?.id ?? source?.userId ?? source?.sub
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : value ?? null
}

function firstItem(data) {
  if (!data) return null
  return Array.isArray(data) ? (data[0] ?? null) : data
}

function readUsername(source) {
  if (!source) return null
  if (typeof source.username === 'string' && source.username.trim()) {
    return source.username.trim()
  }
  return null
}

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

export function saveSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user ?? null))
  localStorage.setItem(LOGGED_IN_KEY, 'true')
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.setItem(LOGGED_IN_KEY, 'false')
}

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

export async function createUser({ email, password, roles = ['user'] }) {
  return request('/api/users', {
    method: 'POST',
    body: { email, password, roles },
  })
}

export async function createProfile({ userId, username, token }) {
  return request('/api/profiles', {
    method: 'POST',
    token,
    body: { userId, username },
  })
}

export async function getMyProfile(token, userId) {
  if (userId == null) return null
  const data = await request(`/api/users/${userId}/profiles`, { token })
  return firstItem(data)
}

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

function asList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.reviews)) return data.reviews
  return []
}

export async function getReviewsForMedia(mediaType, mediaId, token) {
  const list = asList(await request('/api/reviews', { token }))
  return list
    .filter(
      (review) => review.mediaType === mediaType && Number(review.mediaId) === Number(mediaId),
    )
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

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
