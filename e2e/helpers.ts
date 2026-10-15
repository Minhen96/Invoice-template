import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

const convexCli = fileURLToPath(new URL('../node_modules/convex/bin/main.js', import.meta.url))

/** The latest sign-in code for `email` from the local dev outbox (AUTH_DEV_OUTBOX=true). */
export function latestCode(email: string): string {
  const output = execFileSync(
    process.execPath,
    [convexCli, 'run', 'devOutbox:latest', JSON.stringify({ email })],
    { encoding: 'utf8' },
  )
  const parsed = JSON.parse(output.trim()) as { code: string } | null
  if (!parsed) throw new Error(`No code found for ${email}`)
  return parsed.code
}

export function uniqueEmail(label: string): string {
  return `e2e-${label}-${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}@example.com`
}

/** Sign up a fresh account through the real UI (email + password + 6-digit code). */
export async function signUp(page: Page, email: string, password = 'correct-horse-battery') {
  await page.goto('/signup')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  await expect.poll(() => latestCode(email), { timeout: 15_000 }).toMatch(/^\d{6}$/)
  await page.getByLabel('Code').fill(latestCode(email))
  await page.getByRole('button', { name: 'Continue' }).click()
  // Password hashing (scrypt) is slow on purpose; the local backend can take a few seconds.
  await expect(page.getByRole('heading', { name: 'Invoices', level: 1 })).toBeVisible({
    timeout: 20_000,
  })
}

/** WCAG 2.2 AA, including colour contrast (which jsdom unit tests can't check). */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    // The printed invoice is a document design, not app UI; its palette is user-chosen.
    .exclude('.doc-page')
    .analyze()
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([])
}
