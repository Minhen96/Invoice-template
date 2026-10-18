import { api } from '@convex/_generated/api'
import { within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { fakeConvex } from '@/testing/fake-convex'
import { profileResult } from '@/testing/fixtures'
import { currentPath, expectNoA11yViolations, renderApp, screen } from '@/testing/render-app'

describe('privacy and terms', () => {
  it('shows the privacy policy to anyone, without signing in', async () => {
    const { router } = await renderApp('/privacy', { signedIn: false })
    expect(currentPath(router)).toBe('/privacy')
    expect(screen.getByRole('heading', { name: 'Privacy policy', level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/Sydney, Australia/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'hello@dreavelab.com' })[0]).toHaveAttribute(
      'href',
      'mailto:hello@dreavelab.com',
    )
    await expectNoA11yViolations()
  })

  it('shows the terms to anyone, linking to the privacy policy', async () => {
    const { user, router } = await renderApp('/terms', { signedIn: false })
    expect(screen.getByRole('heading', { name: 'Terms of service', level: 1 })).toBeInTheDocument()
    await expectNoA11yViolations()
    await user.click(screen.getByRole('link', { name: 'privacy policy' }))
    expect(currentPath(router)).toBe('/privacy')
  })

  it('is linked from the sign-in pages', async () => {
    const { user, router } = await renderApp('/login', { signedIn: false })
    const legal = within(await screen.findByRole('navigation', { name: 'Legal' }))
    await user.click(legal.getByRole('link', { name: 'Terms' }))
    expect(currentPath(router)).toBe('/terms')
  })

  it('is linked from the Account page', async () => {
    fakeConvex.setQuery(api.profiles.get, profileResult())
    fakeConvex.setQuery(api.businesses.list, [])
    fakeConvex.setQuery(api.bankAccounts.list, [])
    await renderApp('/account')
    const legal = within(screen.getByRole('navigation', { name: 'Legal' }))
    expect(legal.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
  })
})
