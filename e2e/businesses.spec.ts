import { expect, test } from '@playwright/test'

import { fillAccountDetails, signUp, uniqueEmail } from './helpers'

/** Two businesses: the default is used unless a template picks the other one. */
test('a template can invoice as a second business', async ({ page }) => {
  test.setTimeout(120_000)
  await signUp(page, uniqueEmail('biz'))
  await fillAccountDetails(page)

  await page.getByRole('button', { name: /^Business/ }).click()
  await page
    .getByRole('dialog', { name: 'Your businesses' })
    .getByRole('button', { name: 'Add business' })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Add business' })
  await dialog.getByLabel('Business name').fill('MIN HEN STUDIO')
  await dialog.getByLabel('Address').fill('Kuala Lumpur')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('button', { name: /^Business/ })).toContainText('+ 1 more')
  await page.getByRole('button', { name: /^Business/ }).click()
  const list = page.getByRole('dialog', { name: 'Your businesses' })
  await expect(list.getByRole('button', { name: /^LIM KAI XIN TRADING/ })).toContainText('Default')
  await page.screenshot({ path: 'test-results/shot-account.png', fullPage: true })
  await page.keyboard.press('Escape')

  await page.getByRole('link', { name: 'Templates', exact: true }).first().click()
  // Every account starts with a default template.
  await page.getByRole('link', { name: 'Default', exact: true }).click()
  await expect(page).toHaveURL(/\/templates\//)
  const preview = page.getByRole('region', { name: 'Preview' })
  await expect(preview.getByText('LIM KAI XIN TRADING AS LIM KAI XIN')).toBeVisible()

  await page.getByLabel('Business', { exact: true }).selectOption({ label: 'MIN HEN STUDIO' })
  await expect(preview.getByText('MIN HEN STUDIO')).toBeVisible()
  await page.getByRole('radio', { name: 'Just an amount' }).check()
  await page.getByRole('button', { name: 'Add a column here' }).click()
  await page.getByLabel('Your column 1 heading').fill('Date')
  await page.getByRole('heading', { name: 'Items table' }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/shot-columns.png', fullPage: true })
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page).toHaveURL(/\/templates$/)

  await page
    .getByRole('button', { name: /^(New invoice|Create)$/ })
    .first()
    .click()
  await page.getByRole('dialog').getByRole('button', { name: 'Create invoice' }).click()
  await expect(page).toHaveURL(/\/invoices\//)
  const invoice = page.getByRole('region', { name: 'Preview' })
  await expect(invoice.getByText('MIN HEN STUDIO')).toBeVisible()
  await expect(invoice.getByRole('columnheader', { name: 'Date' })).toBeVisible()
  await expect(invoice.getByRole('columnheader', { name: /Quantity/ })).toHaveCount(0)
})
