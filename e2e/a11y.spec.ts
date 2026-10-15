import { expect, test } from '@playwright/test'

import { expectAccessible, signUp, uniqueEmail } from './helpers'

test('signed-out visitors land on log in, and the auth pages are accessible', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
  await expectAccessible(page)
  await page.goto('/signup')
  await expectAccessible(page)
  await page.goto('/forgot-password')
  await expectAccessible(page)
})

test('every signed-in page is accessible', async ({ page }) => {
  test.setTimeout(90_000)
  await signUp(page, uniqueEmail('a11y'))
  await expectAccessible(page)

  await page.getByRole('link', { name: 'Clients' }).first().click()
  await expect(page.getByRole('heading', { name: 'Clients', level: 1 })).toBeVisible()
  await expectAccessible(page)

  await page.getByRole('link', { name: 'Settings' }).first().click()
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()
  await expectAccessible(page)

  await page.getByRole('link', { name: 'Invoices' }).first().click()
  await page.getByRole('button', { name: 'New invoice' }).first().click()
  await expect(page).toHaveURL(/\/invoices\//)
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()
  await expectAccessible(page)
})
