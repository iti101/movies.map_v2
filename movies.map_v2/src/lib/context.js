import { createContext, useContext } from 'react'

/** Context plus a hook that fails clearly outside its provider. */
export function createRequiredContext(hookName, providerName) {
  const Context = createContext(null)

  function useRequiredContext() {
    const value = useContext(Context)
    if (!value) {
      throw new Error(`${hookName} must be used within ${providerName}`)
    }
    return value
  }

  return [Context, useRequiredContext]
}
