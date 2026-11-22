import { createRequiredContext } from '../lib/context.js'

export const [SessionContext, useSession] = createRequiredContext(
  'useSession',
  'SessionProvider',
)
