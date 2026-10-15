import { httpRouter } from 'convex/server'

import { auth } from './auth'

const http = httpRouter()

// OAuth callbacks and the JWKS endpoint used to verify session tokens.
auth.addHttpRoutes(http)

export default http
