import { createFileRoute, redirect } from '@tanstack/react-router'

/** Settings moved into Account; old links keep working. */
export const Route = createFileRoute('/_app/settings')({
  beforeLoad: () => {
    throw redirect({ to: '/account', replace: true })
  },
})
