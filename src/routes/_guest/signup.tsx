import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { SignupForm } from '@/features/auth'

export const Route = createFileRoute('/_guest/signup')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: SignupPage,
})

function SignupPage() {
  const { redirect } = Route.useSearch()
  return <SignupForm redirect={redirect} />
}
