import { useCallback, useMemo, useState } from 'react'
import { clearSession, loadSession, saveSession } from '../API/novi.js'
import AuthModal from '../components/AuthModal.jsx'
import { SessionContext } from './session-context.js'

const SIGNED_OUT = { isLoggedIn: false, token: null, user: null }

export function SessionProvider({ children }) {
  const [session, setSession] = useState(loadSession)
  const [authOpen, setAuthOpen] = useState(false)

  const openAuth = useCallback(() => setAuthOpen(true), [])
  const closeAuth = useCallback(() => setAuthOpen(false), [])

  const signIn = useCallback((next) => {
    saveSession(next)
    setSession({ isLoggedIn: true, token: next.token, user: next.user })
    setAuthOpen(false)
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setSession(SIGNED_OUT)
  }, [])

  const value = useMemo(
    () => ({
      ...session,
      authOpen,
      openAuth,
      closeAuth,
      signIn,
      signOut,
    }),
    [session, authOpen, openAuth, closeAuth, signIn, signOut],
  )

  return (
    <SessionContext.Provider value={value}>
      {children}
      <AuthModal />
    </SessionContext.Provider>
  )
}
