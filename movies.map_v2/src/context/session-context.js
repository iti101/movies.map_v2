import { createContext, useContext } from 'react'

export const SessionContext = createContext(null)

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return value
}
