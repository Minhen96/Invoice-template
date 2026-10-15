import { expect, test } from '@playwright/test'

import { signUp, uniqueEmail } from './helpers'

/**
 * The main story: a freelancer signs up, fills in their details once, recreates their monthly
 * invoice, saves it as PDF, records the payment and copies it for next month.
 */
test('sign up → invoice → PDF → paid → next month', async ({ page }) => {
  test.setTimeout(120_000)
  const email = uniqueEmail('journey')
  await signUp(page, email)

  // Details once, in Settings.
  await page.getByRole('link', { name: 'Open settings' }).click()
  const business = page.locator('div.rounded-card', {
    has: page.getByRole('heading', { name: 'Your business' }),
  })
  await business.getByLabel('Business name').fill('LIM KAI XIN TRADING AS LIM KAI XIN')
  await business.getByLabel('Registration no. (optional)').fill('202303080716 (KT0000000-W)')
  await business
    .getByLabel('Address')
    .fill('Lot 1, Jalan Contoh\nImpiana Condovilla,\n16100 Kota Bharu, Kelantan')
  await business.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Business details saved')).toBeVisible()

  const paymentCard = page.locator('div.rounded-card', {
    has: page.getByRole('heading', { name: 'Payment details' }),
  })
  await paymentCard.getByLabel('Account name').fill('LIM KAI XIN')
  await paymentCard.getByLabel('ID number (optional)').fill('000000-00-0000')
  await paymentCard.getByLabel('Bank').fill('Public Bank')
  await paymentCard.getByLabel('Account no.').fill('1234567890')
  await paymentCard.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Payment details saved')).toBeVisible()

  // New invoice, filled in like the paper one.
  await page.getByRole('button', { name: 'New invoice' }).first().click()
  await expect(page).toHaveURL(/\/invoices\//)
  await expect(page.getByRole('heading', { name: '2026001', level: 1 })).toBeVisible()

  await page.getByLabel('Name', { exact: true }).fill('Astro Radio Sdn Bhd')
  await page
    .getByLabel('Address')
    .first()
    .fill(
      'All Asia Broadcast Centre\nTechnology Park Malaysia\nLebuhraya Puchong-Sg Besi, Bukit Jalil\n57000 Kuala Lumpur',
    )
  await page.getByLabel('Attention (optional)').fill('Accounts Payable Department')
  await page.getByPlaceholder(/What is it for/).fill('FULL TIME ANNOUNCER OCT 2026\n(20 days)')
  await page.getByText('Rename columns').click()
  await page.getByLabel('Rate column heading').fill('Rate Per Session / Hour*')
  await page.getByLabel('Quantity column heading').fill('Quantity (session)')
  await page.getByLabel(/^Rate Per Session/).fill('250')
  await page.getByLabel('Quantity (session)', { exact: true }).fill('20')
  await page
    .getByLabel('Notes')
    .fill('*whichever applicable\nStation name: GOXUAN\n\nVendor code: 1029934')

  const preview = page.getByRole('region', { name: 'Preview' })
  await expect(preview.getByText('5,000.00').first()).toBeVisible()
  await expect(preview.getByText('Bank Account: 1234567890')).toBeVisible()
  await expect(page.getByText('Saved', { exact: true })).toBeVisible({ timeout: 10_000 })
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
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Astro Radio Sdn Bhd')

  // Back on the list: unpaid, then paid.
  await page.getByRole('link', { name: 'Invoices' }).first().click()
  const row = page.getByRole('row', { name: /2026001/ })
  await expect(row.getByText('RM 5,000.00')).toBeVisible()
  await expect(row.getByText('Unpaid')).toBeVisible()
  await row.getByRole('button', { name: 'Actions for 2026001' }).click()
  await page.getByRole('menuitem', { name: 'Mark as paid' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Mark as paid' }).click()
  await expect(row.getByText('Paid', { exact: true })).toBeVisible()

  // Next month's copy.
  await row.getByRole('button', { name: 'Actions for 2026001' }).click()
  await page.getByRole('menuitem', { name: 'Duplicate for next month' }).click()
  await expect(page.getByRole('heading', { name: '2026002', level: 1 })).toBeVisible()
  await expect(page.getByPlaceholder(/What is it for/)).toHaveValue(
    'FULL TIME ANNOUNCER NOV 2026\n(20 days)',
  )
  await expect(page.getByText('Unpaid')).toBeVisible()

  // Log out and back in: same data.
  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('correct-horse-battery')
  await page.getByRole('button', { name: 'Log in' }).click()
  // Back where we were, with everything still there.
  await expect(page.getByRole('heading', { name: '2026002', level: 1 })).toBeVisible({
    timeout: 20_000,
  })
  await page.getByRole('link', { name: 'Invoices' }).first().click()
  await expect(
    page.getByRole('row', { name: /2026001/ }).getByText('Paid', { exact: true }),
  ).toBeVisible()
})

test('one account never sees another account’s invoices', async ({ browser }) => {
  test.setTimeout(90_000)
  const alice = await browser.newPage()
  await signUp(alice, uniqueEmail('alice'))
  await alice.getByRole('button', { name: 'New invoice' }).first().click()
  await expect(alice).toHaveURL(/\/invoices\//)
  const aliceUrl = alice.url()

  const bob = await (await browser.newContext()).newPage()
  await signUp(bob, uniqueEmail('bob'))
  await expect(bob.getByText('No invoices yet.')).toBeVisible()
  await bob.goto(aliceUrl)
  await expect(bob.getByText("This invoice doesn't exist.")).toBeVisible()
})
