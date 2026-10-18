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
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(password)
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
  // WCAG 1.4.10 Reflow: nothing may make the page scroll sideways (e.g. on a phone).
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'page scrolls sideways').toBeLessThanOrEqual(0)

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    // The printed invoice is a document design, not app UI; its palette is user-chosen.
    .exclude('.doc-page')
    .analyze()
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([])
}

/** A new account's first invoice: set up a template (with defaults), then create from it. */
export async function firstInvoice(page: Page) {
  await page
    .getByRole('button', { name: /^(New invoice|Create)$/ })
    .first()
    .click()
  await page.getByRole('dialog').getByRole('button', { name: 'Set up template' }).click()
  await expect(page).toHaveURL(/\/templates\//)
  await page.getByRole('button', { name: /New invoice with this/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Create invoice' }).click()
  await expect(page).toHaveURL(/\/invoices\//)
}

/** Add a business and a bank account on the Account page (each opens in a popup). */
export async function fillAccountDetails(page: Page) {
  await page.getByRole('link', { name: 'Account', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Account', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Business/ })).toContainText('Incomplete')

  await page.getByRole('button', { name: /^Business/ }).click()
  const business = page.getByRole('dialog', { name: 'Add business' })
  await business.getByLabel('Business name').fill('LIM KAI XIN TRADING AS LIM KAI XIN')
  await business.getByLabel('Registration no. (optional)').fill('202303080716 (KT0000000-W)')
  await business
    .getByLabel('Address')
    .fill('Lot 1, Jalan Contoh\nImpiana Condovilla,\n16100 Kota Bharu, Kelantan')
  await business.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Business saved')).toBeVisible()

  await page.getByRole('button', { name: /^Bank account/ }).click()
  const bank = page.getByRole('dialog', { name: 'Add bank account' })
  await bank.getByLabel('Account name').fill('LIM KAI XIN')
  await bank.getByLabel('ID number (optional)').fill('000000-00-0000')
  await bank.getByLabel('Bank').fill('Public Bank')
  await bank.getByLabel('Account no.').fill('1234567890')
  await bank.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Bank account saved')).toBeVisible()
  await expect(page.getByText('Incomplete')).toHaveCount(0)
}
