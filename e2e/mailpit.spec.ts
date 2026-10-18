import { expect, test } from '@playwright/test'

const MAILPIT = 'http://127.0.0.1:8025'

/** Local email: the sign-up code arrives in Mailpit (npm run mail). Skipped when it isn't running. */
test('sign-up code arrives in the local Mailpit inbox', async ({ page, request }) => {
  const up = await request.get(`${MAILPIT}/api/v1/info`).then(
    (r) => r.ok(),
    () => false,
  )
  test.skip(!up, 'Mailpit is not running (npm run mail)')

  const email = `e2e-mailpit-${String(Date.now())}@example.com`
  await page.goto('/signup')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery')
  await page.getByLabel('Confirm password').fill('correct-horse-battery')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()

  let message: { ID: string; Subject: string } | undefined
  await expect
    .poll(
      async () => {
        const response = await request.get(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
        )
        const data = (await response.json()) as { messages: { ID: string; Subject: string }[] }
        message = data.messages[0]
        return message?.Subject
      },
      { timeout: 15_000 },
    )
    .toBe('Your sign-up code')

  const body = (await (await request.get(`${MAILPIT}/api/v1/message/${message!.ID}`)).json()) as {
    Text: string
  }
  const code = /\b(\d{6})\b/.exec(body.Text)?.[1]
  expect(code).toBeDefined()
  await page.getByLabel('Code').fill(code!)
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Invoices', level: 1 })).toBeVisible({
    timeout: 20_000,
  })
})
