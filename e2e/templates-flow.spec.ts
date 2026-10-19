import { expect, test } from '@playwright/test'

import { fillAccountDetails, signUp, uniqueEmail } from './helpers'

/**
 * The template-first flow: set up a template once, then an invoice is just
 * client + items (remembered items are suggested the next time).
 */
test('template once → invoice → item remembered for next time', async ({ page }) => {
  test.setTimeout(120_000)
  await signUp(page, uniqueEmail('templates'))

  // Business and bank details once, in Account.
  await fillAccountDetails(page)

  // A template of your own (next to the default one), with a "Date" column.
  await page.getByRole('link', { name: 'Templates', exact: true }).first().click()
  await page.getByRole('button', { name: 'New template' }).click()
  await expect(page).toHaveURL(/\/templates\/new$/)
  await page.getByLabel('Template name').fill('Astro announcer')
  await page.getByRole('button', { name: 'Add a column here' }).click()
  await page.getByLabel('Your column 1 heading').fill('Date')
  await page.screenshot({ path: 'test-results/shot-template-editor.png', fullPage: true })
  await page.getByRole('button', { name: 'Create template' }).click()
  await expect(page.getByRole('link', { name: 'Astro announcer', exact: true })).toBeVisible()

  // Client, once.
  await page.getByRole('link', { name: 'Clients' }).first().click()
  await page.getByRole('button', { name: 'Add client' }).first().click()
  const clientDialog = page.getByRole('dialog')
  await clientDialog.getByLabel('Name').fill('Astro Radio Sdn Bhd')
  await clientDialog.getByLabel('Address').fill('All Asia Broadcast Centre\n57000 Kuala Lumpur')
  await clientDialog.getByRole('button', { name: 'Add client' }).click()
  await expect(page.getByRole('heading', { name: 'Astro Radio Sdn Bhd' })).toBeVisible()

  // New invoice: popup → create.
  await page
    .getByRole('button', { name: /^(New invoice|Create)$/ })
    .first()
    .click()
  const dialog = page.getByRole('dialog', { name: 'New invoice' })
  await dialog.getByLabel('Client', { exact: true }).selectOption({ label: 'Astro Radio Sdn Bhd' })
  await page.screenshot({ path: 'test-results/shot-new-invoice.png' })
  await dialog.getByRole('button', { name: 'Create invoice' }).click()
  await expect(page).toHaveURL(/\/invoices\//)

  const preview = page.getByRole('region', { name: 'Preview' })
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await preview.getByRole('button', { name: '+ Add item' }).click()
  const item = page.getByRole('dialog', { name: 'Item 1' })
  await item.getByLabel('Item 1 Description').fill('FULL TIME ANNOUNCER\n(20 days)')
  await item.getByLabel('Rate (RM)').fill('250')
  await item.getByLabel('Quantity', { exact: true }).fill('20')
  await item.getByLabel('Item 1 Date').fill('1–20 Oct')
  await item.getByRole('button', { name: 'Done' }).click()
  await expect(preview.getByText('5,000.00').first()).toBeVisible()
  await expect(preview.getByText('Bank Account: 1234567890')).toBeVisible()
  await expect(preview.getByRole('cell', { name: '1–20 Oct' })).toBeVisible()
  await page.screenshot({ path: 'test-results/shot-editor.png', fullPage: true })
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()

  // Saving remembered the item.
  await page.getByRole('link', { name: 'Items', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Items', level: 1 })).toBeVisible()
  const items = page.getByRole('main')
  await expect(items.getByText('FULL TIME ANNOUNCER')).toBeVisible()
  await expect(items.getByText('250.00')).toBeVisible()
  await page.screenshot({ path: 'test-results/shot-items.png' })

  // Next invoice: the item is suggested; picking fills the price and quantity.
  await page
    .getByRole('button', { name: /^(New invoice|Create)$/ })
    .first()
    .click()
  await page.getByRole('dialog').getByRole('button', { name: 'Create invoice' }).click()
  await expect(page).toHaveURL(/\/invoices\//)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page
    .getByRole('region', { name: 'Preview' })
    .getByRole('button', { name: '+ Add item' })
    .click()
  const next = page.getByRole('dialog', { name: 'Item 1' })
  await next.getByLabel('Item 1 Description').fill('full')
  await page.getByRole('option', { name: /FULL TIME ANNOUNCER/ }).click()
  await expect(next.getByLabel('Rate (RM)')).toHaveValue('250.00')
  await expect(next.getByLabel('Quantity', { exact: true })).toHaveValue('20')
  await next.getByRole('button', { name: 'Done' }).click()
  // The last-used client was pre-picked.
  await expect(
    page.getByRole('region', { name: 'Preview' }).getByText('Astro Radio Sdn Bhd'),
  ).toBeVisible()
})
