import { createRouter, type RouterHistory } from '@tanstack/react-router'

import { routeTree } from '@/routeTree.gen'

export interface RouterContext {
  auth: { isAuthenticated: boolean }
}

export function createAppRouter(history?: RouterHistory) {
  return createRouter({
    routeTree,
    history,
    // Filled in by <RouterProvider context={…}> once the session is known.
    context: { auth: { isAuthenticated: false } },
    defaultPreload: 'intent',
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
