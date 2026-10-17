import { expect, test } from '@playwright/test'

import { expectAccessible, firstInvoice, signUp, uniqueEmail } from './helpers'

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

  await page.getByRole('link', { name: 'Account', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Account', level: 1 })).toBeVisible()
  await expectAccessible(page)

  await page.getByRole('link', { name: 'Items', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Items', level: 1 })).toBeVisible()
  await expectAccessible(page)

  await page.getByRole('link', { name: 'Templates', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Templates', level: 1 })).toBeVisible()
  await expectAccessible(page)

  // New invoice popup (first time: asks for a template).
  await page
    .getByRole('button', { name: /^(New invoice|Create)$/ })
    .first()
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expectAccessible(page)
  await page.getByRole('dialog').getByRole('button', { name: 'Later' }).click()

  await firstInvoice(page)
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
  await expectAccessible(page)
  // Edit mode too.
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible()
  await expectAccessible(page)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()

  // New invoice popup with its choices and live preview.
  await page
    .getByRole('button', { name: /^(New invoice|Create)$/ })
    .first()
    .click()
  await expect(page.getByRole('dialog').getByLabel('Invoice date')).toBeVisible()
  await expectAccessible(page)
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()

  // The lists again, now with a card (and its preview) in them: still no sideways scroll.
  await page.getByRole('link', { name: 'Invoices', exact: true }).first().click()
  await expect(page.getByRole('article').first()).toBeVisible()
  await expectAccessible(page)
  await page.getByRole('link', { name: 'Templates', exact: true }).first().click()
  await expect(page.getByRole('link', { name: 'My template', exact: true })).toBeVisible()
  await expectAccessible(page)

  // Template editor.
  await page.getByRole('link', { name: 'My template', exact: true }).click()
  await expect(page.getByLabel('Template name')).toBeVisible()
  await expectAccessible(page)
})
