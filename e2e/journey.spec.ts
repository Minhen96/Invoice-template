import { expect, test } from '@playwright/test'

import { fillAccountDetails, firstInvoice, signUp, uniqueEmail } from './helpers'

/**
 * The main story: a freelancer signs up, fills in their details once, recreates their monthly
 * invoice, saves it as PDF, records the payment and copies it for next month.
 */
test('sign up → invoice → PDF → paid → next month', async ({ page }) => {
  test.setTimeout(120_000)
  const email = uniqueEmail('journey')
  await signUp(page, email)

  // Business and bank details once, in Account; then the template (look + columns).
  await fillAccountDetails(page)
  await page.getByRole('link', { name: 'Templates', exact: true }).first().click()
  await page.getByRole('button', { name: /Create your first template/ }).click()
  await expect(page).toHaveURL(/\/templates\//)
  await page.getByLabel('Template name').fill('Astro announcer')
  await page.getByLabel('Rate column heading').fill('Rate Per Session / Hour*')
  await page.getByLabel('Quantity column heading').fill('Quantity (session)')
  await expect(page.getByText('Auto-saved', { exact: true })).toBeVisible({ timeout: 10_000 })

  // New invoice, filled in like the paper one (a one-off client, typed in).
  await page
    .getByRole('button', { name: /^(New invoice|Create)$/ })
    .first()
    .click()
  await page.getByRole('dialog').getByRole('button', { name: 'Create invoice' }).click()
  await expect(page).toHaveURL(/\/invoices\//)
  await expect(page.getByRole('heading', { name: '2026001', level: 1 })).toBeVisible()

  // It opens as the real invoice; Edit makes each part of it clickable.
  const preview = page.getByRole('region', { name: 'Preview' })
  await expect(preview.getByRole('button')).toHaveCount(0)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await preview.getByRole('button', { name: "Edit who it's billed to" }).click()
  let dialog = page.getByRole('dialog', { name: 'Bill to' })
  await dialog.getByLabel('Name', { exact: true }).fill('Astro Radio Sdn Bhd')
  await dialog
    .getByLabel('Address')
    .fill(
      'All Asia Broadcast Centre\nTechnology Park Malaysia\nLebuhraya Puchong-Sg Besi, Bukit Jalil\n57000 Kuala Lumpur',
    )
  await dialog.getByLabel('Attention (optional)').fill('Accounts Payable Department')
  await dialog.getByRole('button', { name: 'Done' }).click()

  await preview.getByRole('button', { name: '+ Add item' }).click()
  dialog = page.getByRole('dialog', { name: 'Item 1' })
  await dialog.getByLabel('Item 1 Description').fill('FULL TIME ANNOUNCER OCT 2026\n(20 days)')
  await dialog.getByLabel(/^Rate Per Session/).fill('250')
  await dialog.getByLabel('Quantity (session)', { exact: true }).fill('20')
  await dialog.getByRole('button', { name: 'Done' }).click()

  await preview.getByRole('button', { name: '+ Add notes' }).click()
  dialog = page.getByRole('dialog', { name: 'Notes' })
  await dialog
    .getByLabel('Notes')
    .fill('*whichever applicable\nStation name: GOXUAN\n\nVendor code: 1029934')
  await dialog.getByRole('button', { name: 'Done' }).click()

  await expect(preview.getByText('5,000.00').first()).toBeVisible()
  await expect(preview.getByText('Bank Account: 1234567890')).toBeVisible()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
  await preview.screenshot({ path: 'test-results/blush-preview.png' })

  // Save as PDF: render the print view and produce a real PDF.
  await page.evaluate(() => {
    window.print = () => undefined
  })
  await page.getByRole('button', { name: 'Download PDF' }).click()
  await expect(page.locator('#print-root .doc-page')).toHaveCount(1)
  expect(await page.title()).toBe('Invoice 2026001 - Astro Radio Sdn Bhd')
  await page.emulateMedia({ media: 'print' })
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    path: 'test-results/invoice.pdf',
  })
  expect(pdf.byteLength).toBeGreaterThan(10_000)
  // A normal one-item invoice must fit on a single A4 page.
  expect(pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g)).toHaveLength(1)
  await page.emulateMedia({ media: 'screen' })

  // Survives a reload (saved on the server, not just in the page).
  await page.reload()
  await expect(
    page.getByRole('region', { name: 'Preview' }).getByText('Astro Radio Sdn Bhd'),
  ).toBeVisible({ timeout: 15_000 })

  // Back on the list: unpaid, then paid.
  await page.getByRole('link', { name: 'Invoices' }).first().click()
  const row = page.getByRole('article', { name: '2026001' })
  await expect(row).toContainText('RM 5,000.00')
  await expect(row.getByText('Unpaid')).toBeVisible()
  await row.getByRole('button', { name: 'Actions for 2026001' }).click()
  await page.getByRole('menuitem', { name: 'Mark as paid' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Mark as paid' }).click()
  await expect(row.getByText('Paid', { exact: true })).toBeVisible()

  // Next month's copy.
  await row.getByRole('button', { name: 'Actions for 2026001' }).click()
  await page.getByRole('menuitem', { name: 'Duplicate for next month' }).click()
  await expect(page.getByRole('heading', { name: '2026002', level: 1 })).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Preview' }).getByRole('cell', { name: /ANNOUNCER NOV 2026/ }),
  ).toBeVisible()
  await expect(page.getByText('Unpaid')).toBeVisible()

  // Log out and back in: same data.
  await page.getByRole('link', { name: 'Account', exact: true }).click()
  await page.getByRole('button', { name: 'Log out', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('correct-horse-battery')
  await page.getByRole('button', { name: 'Log in' }).click()
  // Back where we were (Account), with everything still there.
  await expect(page.getByRole('heading', { name: 'Account', level: 1 })).toBeVisible({
    timeout: 20_000,
  })
  await page.getByRole('link', { name: 'Invoices' }).first().click()
  await expect(page.getByRole('article', { name: '2026002' })).toBeVisible()
  await expect(
    page.getByRole('article', { name: '2026001' }).getByText('Paid', { exact: true }),
  ).toBeVisible()
})

test('one account never sees another account’s invoices', async ({ browser }) => {
  test.setTimeout(90_000)
  const alice = await browser.newPage()
  await signUp(alice, uniqueEmail('alice'))
  await firstInvoice(alice)
  const aliceUrl = alice.url()

  const bob = await (await browser.newContext()).newPage()
  await signUp(bob, uniqueEmail('bob'))
  await expect(bob.getByText('No invoices yet.')).toBeVisible()
  await bob.goto(aliceUrl)
  await expect(bob.getByText("This invoice doesn't exist.")).toBeVisible()
})
