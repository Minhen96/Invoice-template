import { api } from '@convex/_generated/api'
import { ConvexError } from 'convex/values'
import { within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { fakeConvex } from '@/testing/fake-convex'
import { itemDoc } from '@/testing/fixtures'
import { expectNoA11yViolations, renderApp, screen } from '@/testing/render-app'

const items = [
  itemDoc(),
  itemDoc({
    _id: 'item2' as never,
    key: 'voice-over',
    description: 'Voice-over',
    rateSen: 9000,
    useCount: 1,
  }),
]

describe('items page', () => {
  it('explains that items are remembered, and offers to add one', async () => {
    fakeConvex.setQuery(api.items.list, [])
    await renderApp('/items')
    expect(screen.getByText('No items yet.')).toBeInTheDocument()
    expect(screen.getByText(/remembered/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Add item' })).toHaveLength(2)
  })

  it('adds an item by hand, explaining a clash with another', async () => {
    fakeConvex.setQuery(api.items.list, items)
    fakeConvex
      .handler(api.items.create)
      .mockRejectedValueOnce(new ConvexError({ code: 'duplicate', field: 'description' }))
    const { user } = await renderApp('/items')
    await user.click(screen.getByRole('button', { name: 'Add item' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Add item' }))
    await user.click(dialog.getByRole('button', { name: 'Save' }))
    expect(dialog.getByText('Describe the item.')).toBeInTheDocument()

    await user.type(dialog.getByLabelText('Description'), 'Voice-over')
    await user.type(dialog.getByLabelText('Price'), '90')
    await user.click(dialog.getByRole('button', { name: 'Save' }))
    expect(
      await dialog.findByText('You already have an item with this description.'),
    ).toBeInTheDocument()

    await user.clear(dialog.getByLabelText('Description'))
    await user.type(dialog.getByLabelText('Description'), 'Mixing')
    await user.click(dialog.getByRole('button', { name: 'Save' }))
    expect(fakeConvex.handler(api.items.create)).toHaveBeenLastCalledWith({
      description: 'Mixing',
      rateSen: 9000,
    })
    expect(await screen.findByText('Item added')).toBeInTheDocument()
  })

  it('lists items with their last price and use count, and searches', async () => {
    fakeConvex.setQuery(api.items.list, items)
    const { user } = await renderApp('/items')
    expect(screen.getByText('250.00')).toBeInTheDocument()
    expect(screen.getByText('Used 3 times')).toBeInTheDocument()
    expect(screen.getByText('Used once')).toBeInTheDocument()
    await expectNoA11yViolations()

    await user.type(screen.getByRole('searchbox', { name: 'Search items' }), 'voice')
    expect(screen.queryByText('Used 3 times')).not.toBeInTheDocument()
    expect(screen.getByText('Voice-over')).toBeInTheDocument()
  })

  it('edits an item, explaining a clash with another', async () => {
    fakeConvex.setQuery(api.items.list, items)
    fakeConvex
      .handler(api.items.update)
      .mockRejectedValueOnce(new ConvexError({ code: 'duplicate', field: 'description' }))
    const { user } = await renderApp('/items')
    await user.click(screen.getByRole('button', { name: 'Actions for Voice-over' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit item' }))

    await user.clear(dialog.getByLabelText('Description'))
    await user.type(dialog.getByLabelText('Description'), 'full time announcer (20 days)')
    await user.click(dialog.getByRole('button', { name: 'Save' }))
    expect(
      await dialog.findByText('You already have an item with this description.'),
    ).toBeInTheDocument()

    await user.clear(dialog.getByLabelText('Description'))
    await user.type(dialog.getByLabelText('Description'), 'Voice-over (per hour)')
    await user.clear(dialog.getByLabelText('Price'))
    await user.type(dialog.getByLabelText('Price'), '95')
    await user.click(dialog.getByRole('button', { name: 'Save' }))
    expect(fakeConvex.handler(api.items.update)).toHaveBeenLastCalledWith({
      id: 'item2',
      description: 'Voice-over (per hour)',
      rateSen: 9500,
    })
  })

  it('removes an item after confirming', async () => {
    fakeConvex.setQuery(api.items.list, items)
    const { user } = await renderApp('/items')
    await user.click(screen.getByRole('button', { name: 'Actions for Voice-over' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Remove this item?' }))
    await user.click(dialog.getByRole('button', { name: 'Remove' }))
    expect(fakeConvex.handler(api.items.remove)).toHaveBeenCalledWith({ id: 'item2' })
  })
})
