import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import type * as ConvexReact from 'convex/react'
import type { FunctionReference } from 'convex/server'
import { useSyncExternalStore } from 'react'
import { afterEach, beforeEach, vi } from 'vitest'

import { fakeAuth, fakeConvex } from './fake-convex'

type Ref = FunctionReference<'query' | 'mutation' | 'action'>

vi.mock('convex/react', async (importOriginal) => {
  const actual = await importOriginal<typeof ConvexReact>()
  return {
    ...actual,
    useQuery: (ref: Ref) =>
      useSyncExternalStore(fakeConvex.subscribe, () => fakeConvex.readQuery(ref)),
    // Stable functions per reference, like the real client.
    useMutation: (ref: Ref) => fakeConvex.caller(ref),
    useAction: (ref: Ref) => fakeConvex.caller(ref),
    useConvex: () => ({
      query: (ref: Ref, args?: Record<string, unknown>) => fakeConvex.call(ref, args),
    }),
    useConvexAuth: () => ({ isLoading: false, isAuthenticated: fakeAuth.isAuthenticated }),
  }
})

vi.mock('@convex-dev/auth/react', () => ({
  useAuthActions: () => ({ signIn: fakeAuth.signIn, signOut: fakeAuth.signOut }),
  ConvexAuthProvider: ({ children }: { children: unknown }) => children,
}))

// jsdom gaps used by Radix and the preview.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  addListener: () => undefined,
  removeListener: () => undefined,
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia
Element.prototype.scrollIntoView ??= function scrollIntoView() {}
window.scrollTo = () => undefined
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => undefined
Element.prototype.releasePointerCapture ??= () => undefined

beforeEach(() => {
  // A fixed "today" (15 Oct 2026, morning in Malaysia). Only Date is faked; timers stay real.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 15, 9, 30) })
  fakeConvex.reset()
  fakeAuth.reset()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
