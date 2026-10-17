import { api } from '@convex/_generated/api'
import { within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { fakeConvex } from '@/testing/fake-convex'
import { renderApp, screen } from '@/testing/render-app'

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
