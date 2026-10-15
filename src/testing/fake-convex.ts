import { getFunctionName, type FunctionReference } from 'convex/server'
import { vi, type Mock } from 'vitest'

/**
 * In-memory stand-in for the Convex backend in component/page tests (the role MSW plays in the
 * stock app). Tests set what queries return and inspect what mutations were called with.
 * Real backend behaviour is covered separately by convex/*.test.ts (convex-test).
 */

type AnyRef = FunctionReference<'query' | 'mutation' | 'action'>
type Handler = Mock<(args: Record<string, unknown>) => unknown>

const queryResults = new Map<string, unknown>()
const handlers = new Map<string, Handler>()
const listeners = new Set<() => void>()
const callers = new Map<string, (args?: Record<string, unknown>) => Promise<unknown>>()

function nameOf(ref: AnyRef): string {
  return getFunctionName(ref)
}

export const fakeConvex = {
  /** What `useQuery(ref)` returns. Leave unset to simulate "still loading" (undefined). */
  setQuery(ref: FunctionReference<'query'>, value: unknown) {
    queryResults.set(nameOf(ref), value)
    for (const listener of listeners) listener()
  },
  /** The mock behind `useMutation(ref)` / `useAction(ref)`; resolves to undefined by default. */
  handler(ref: FunctionReference<'mutation' | 'action'>): Handler {
    const name = nameOf(ref)
    let handler = handlers.get(name)
    if (!handler) {
      handler = vi.fn<(args: Record<string, unknown>) => unknown>(() => undefined)
      handlers.set(name, handler)
    }
    return handler
  },
  reset() {
    queryResults.clear()
    handlers.clear()
  },
  // Used by the hook mocks below.
  readQuery(ref: AnyRef): unknown {
    return queryResults.get(nameOf(ref))
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  caller(ref: AnyRef) {
    const name = nameOf(ref)
    let caller = callers.get(name)
    if (!caller) {
      caller = (args?: Record<string, unknown>) => fakeConvex.call(ref, args)
      callers.set(name, caller)
    }
    return caller
  },
  call(ref: AnyRef, args: Record<string, unknown> = {}): Promise<unknown> {
    const name = nameOf(ref)
    // Queries called imperatively (e.g. export) read the stored result.
    if (queryResults.has(name)) return Promise.resolve(queryResults.get(name))
    const handler = fakeConvex.handler(ref as FunctionReference<'mutation' | 'action'>)
    return Promise.resolve().then(() => handler(args))
  },
}

export const fakeAuth = {
  isAuthenticated: false,
  signIn:
    vi.fn<
      (provider: string, params?: Record<string, unknown>) => Promise<{ signingIn: boolean }>
    >(),
  signOut: vi.fn<() => Promise<void>>(),
  reset() {
    this.isAuthenticated = false
    this.signIn.mockReset().mockResolvedValue({ signingIn: true })
    this.signOut.mockReset().mockResolvedValue(undefined)
  },
}
