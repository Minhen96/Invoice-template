import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { LoginForm } from '@/features/auth'

export const Route = createFileRoute('/_guest/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect } = Route.useSearch()
  return <LoginForm redirect={redirect} />
}
