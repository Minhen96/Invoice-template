import { expect, test } from '@playwright/test'

import { firstInvoice, signUp, uniqueEmail } from './helpers'

/** Deleting the account removes it for good: you're signed out and can't log back in. */
test('delete account', async ({ page }) => {
  test.setTimeout(120_000)
  const email = uniqueEmail('delete')
  await signUp(page, email)
  await firstInvoice(page)

  await page.getByRole('link', { name: 'Account', exact: true }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Delete your account?' })
  await dialog.getByLabel(`Type ${email} to confirm`).fill(email)
  await dialog.getByRole('button', { name: 'Delete forever' }).click()

  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Your account and its data were deleted.')).toBeVisible()
  await expect(page.getByText(/Couldn't load/)).toHaveCount(0)

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByText('Wrong email or password.')).toBeVisible({ timeout: 15_000 })
})
