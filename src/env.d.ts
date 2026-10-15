/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL?: string
  /** "true" once Google sign-in is configured on the backend. */
  readonly VITE_AUTH_GOOGLE?: string
}

/**
 * Convex function files read `process.env` (backend environment variables). The web app sees
 * their types through `convex/_generated/api`, so give the browser build just enough to compile
 * them without pulling in all of Node's types.
 */
declare const process: { env: Record<string, string | undefined> }
