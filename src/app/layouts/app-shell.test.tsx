import { api } from '@convex/_generated/api'
import { within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { fakeConvex } from '@/testing/fake-convex'
import { businessDoc } from '@/testing/fixtures'
import { currentPath, renderApp, screen } from '@/testing/render-app'

describe('main navigation', () => {
  it('goes Invoices, Templates, Clients, Items and marks the current page', async () => {
    fakeConvex.setQuery(api.templates.list, [])
    const { user } = await renderApp('/templates')
    for (const name of ['Main', 'Main (tabs)']) {
      const nav = within(screen.getByRole('navigation', { name }))
      const links = nav.getAllByRole('link')
      expect(links.map((link) => link.textContent)).toEqual([
        'Invoices',
        'Templates',
        'Clients',
        'Items',
      ])
      expect(nav.getByRole('link', { name: 'Templates' })).toHaveAttribute('aria-current', 'page')
      expect(nav.getByRole('link', { name: 'Invoices' })).not.toHaveAttribute('aria-current')
    }

    fakeConvex.setQuery(api.clients.list, [])
    fakeConvex.setQuery(api.invoices.list, [])
    const main = within(screen.getByRole('navigation', { name: 'Main' }))
    await user.click(main.getByRole('link', { name: 'Clients' }))
    expect(main.getByRole('link', { name: 'Clients' })).toHaveAttribute('aria-current', 'page')
  })

  it('highlights Invoices even with filters in the address', async () => {
    fakeConvex.setQuery(api.invoices.list, [])
    fakeConvex.setQuery(api.templates.list, [])
    await renderApp('/?status=all&q=')
    for (const name of ['Main', 'Main (tabs)']) {
      const nav = within(screen.getByRole('navigation', { name }))
      expect(nav.getByRole('link', { name: 'Invoices' })).toHaveAttribute('aria-current', 'page')
    }
  })
})

describe('business details tip', () => {
  const tipName = { name: 'Add your business details' }

  it('points at the account until your business details are in', async () => {
    fakeConvex.setQuery(api.templates.list, [])
    fakeConvex.setQuery(api.businesses.list, [businessDoc({ name: '' })])
    const { router, user } = await renderApp('/templates')
    const tip = within(screen.getByRole('group', tipName))
    await user.click(tip.getByRole('link', { name: /Set up account/ }))
    expect(currentPath(router)).toBe('/account')
    // Not on the Account page itself: you're already there.
    expect(screen.queryByRole('group', tipName)).not.toBeInTheDocument()
  })

  it('can be hidden', async () => {
    fakeConvex.setQuery(api.templates.list, [])
    fakeConvex.setQuery(api.businesses.list, [])
    const { user } = await renderApp('/templates')
    await user.click(screen.getByRole('button', { name: 'Hide tip' }))
    expect(screen.queryByRole('group', tipName)).not.toBeInTheDocument()
  })

  it('stays away while loading', async () => {
    fakeConvex.setQuery(api.templates.list, [])
    await renderApp('/templates')
    expect(screen.queryByRole('group', tipName)).not.toBeInTheDocument()
  })

  it('stays away once the business has a name', async () => {
    fakeConvex.setQuery(api.templates.list, [])
    fakeConvex.setQuery(api.businesses.list, [businessDoc()])
    await renderApp('/templates')
    expect(screen.queryByRole('group', tipName)).not.toBeInTheDocument()
  })
})

describe('footer', () => {
  it('links Privacy, Terms and DreaveLab on every signed-in page', async () => {
    fakeConvex.setQuery(api.templates.list, [])
    await renderApp('/templates')
    const footer = within(screen.getByRole('contentinfo'))
    expect(footer.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
    expect(footer.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms')
    const dreavelab = footer.getByRole('link', { name: /Powered by DreaveLab/ })
    expect(dreavelab).toHaveAttribute('href', 'https://dreavelab.com/')
    expect(dreavelab).toHaveAttribute('target', '_blank')
    expect(dreavelab).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
