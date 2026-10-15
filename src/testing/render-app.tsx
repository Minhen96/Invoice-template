import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { expect } from 'vitest'

import { createAppRouter } from '@/app/router'

import { fakeAuth } from './fake-convex'

/**
 * Render the real app (real routes, guards and pages) at `path`, against the fake backend.
 * Returns the router so tests can check where navigation ended up.
 */
export async function renderApp(path: string, { signedIn = true } = {}) {
  fakeAuth.isAuthenticated = signedIn
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }))
  const user = userEvent.setup()
  const view = render(
    <RouterProvider router={router} context={{ auth: { isAuthenticated: signedIn } }} />,
  )
  await router.load()
  return { router, user, ...view }
}

export function currentPath(router: ReturnType<typeof createAppRouter>): string {
  return router.state.location.pathname
}

/** Accessibility check with axe (contrast is checked in the browser e2e run; jsdom can't). */
export async function expectNoA11yViolations(container: HTMLElement = document.body) {
  const result = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })
  const summary = result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`)
  expect(summary).toEqual([])
}

export { screen }
