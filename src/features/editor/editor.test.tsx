import { api } from '@convex/_generated/api'
import { waitFor, within } from '@testing-library/react'
import { ConvexError } from 'convex/values'
import { describe, expect, it } from 'vitest'

import { fakeConvex } from '@/testing/fake-convex'
import { invoiceDoc, itemDoc, templateDoc } from '@/testing/fixtures'
import { currentPath, expectNoA11yViolations, renderApp, screen } from '@/testing/render-app'

/** The paper. Queried directly: while a popup is open the dialog hides the page from a11y queries. */
function previewSection(): HTMLElement {
  const section = document.querySelector<HTMLElement>('section[aria-label="Preview"]')
  if (!section) throw new Error('preview missing')
  return section
}

function withInvoice(partial = {}) {
  fakeConvex.setQuery(api.invoices.get, invoiceDoc(partial))
  fakeConvex.setQuery(api.templates.list, [templateDoc()])
  fakeConvex.setQuery(api.items.list, [])
  fakeConvex.setQuery(api.clients.list, [])
}

function paper() {
  return within(previewSection())
}

type User = Awaited<ReturnType<typeof renderApp>>['user']

/** Open the invoice and switch to edit mode. */
async function editInvoice(path = '/invoices/inv1') {
  const app = await renderApp(path)
  await app.user.click(screen.getByRole('button', { name: 'Edit' }))
  return app
}

/** Click a part of the paper and return the popup it opens. */
async function openPart(user: User, label: string, title: string) {
  await user.click(paper().getByRole('button', { name: label }))
  return within(await screen.findByRole('dialog', { name: title }))
}

/** Close any popup, press Save, and return what was sent. */
async function save(user: User) {
  const dialog = screen.queryByRole('dialog')
  if (dialog) await user.click(within(dialog).getByRole('button', { name: 'Done' }))
  await user.click(screen.getByRole('button', { name: 'Save' }))
  const calls = fakeConvex.handler(api.invoices.update).mock.calls
  return calls.at(-1)?.[0] as { content: Record<string, unknown>; templateId?: string } | undefined
}

describe('invoice page: the real invoice first', () => {
  it('shows a friendly message for a missing invoice', async () => {
    fakeConvex.setQuery(api.invoices.get, null)
    await renderApp('/invoices/gone')
    expect(screen.getByText("This invoice doesn't exist.")).toBeInTheDocument()
  })

  it('opens as the invoice itself: nothing to click on the paper, no template controls', async () => {
    withInvoice()
    await renderApp('/invoices/inv1')
    expect(screen.getByRole('heading', { name: '2026031', level: 1 })).toBeInTheDocument()
    expect(paper().getByText('Astro Radio Sdn Bhd')).toBeInTheDocument()
    expect(paper().queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryByLabelText('Template')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Look & columns' })).not.toBeInTheDocument()
    for (const name of ['Edit', 'Mark as paid', 'Download PDF', 'Delete invoice']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
    await expectNoA11yViolations()
  })

  it('in edit mode, every part is clickable and only Cancel / Save are offered', async () => {
    withInvoice()
    await editInvoice()
    for (const name of [
      "Edit who it's billed to",
      'Edit invoice number and dates',
      'Edit item 1',
      'Edit discount and tax',
      'Edit notes',
      'Edit payment details',
      'Edit your business details',
    ]) {
      expect(paper().getByRole('button', { name })).toBeInTheDocument()
    }
    expect(screen.getByLabelText('Template')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Look & columns' })).toBeInTheDocument()
    for (const name of ['Mark as paid', 'Download PDF', 'Delete invoice', 'Edit']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    // No status or "Editing" tags beside the title while editing.
    expect(screen.queryByText('Unpaid')).not.toBeInTheDocument()
    expect(screen.queryByText('Editing')).not.toBeInTheDocument()
    await expectNoA11yViolations()
  })
})

describe('editing', () => {
  it('saves nothing until Save, then goes back to the invoice', async () => {
    withInvoice()
    const { user } = await editInvoice()
    const dialog = await openPart(user, 'Edit item 1', 'Item 1')
    await user.clear(dialog.getByLabelText('Quantity (session)'))
    await user.type(dialog.getByLabelText('Quantity (session)'), '22')
    expect(paper().getAllByText('5,500.00').length).toBeGreaterThan(0)
    await user.click(dialog.getByRole('button', { name: 'Done' }))
    await new Promise((resolve) => setTimeout(resolve, 1200))
    expect(fakeConvex.handler(api.invoices.update)).not.toHaveBeenCalled()

    const sent = await save(user)
    expect(sent).toMatchObject({
      id: 'inv1',
      content: { items: [expect.objectContaining({ id: 'a', quantity: 22, rateSen: 25000 })] },
    })
    expect(sent).not.toHaveProperty('templateId')
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(await screen.findByText('Saved')).toBeInTheDocument()
    // Saving remembers the items for next time.
    expect(fakeConvex.handler(api.items.rememberFromInvoice)).toHaveBeenCalledWith({
      invoiceId: 'inv1',
    })
  })

  it('Cancel with no changes just leaves edit mode', async () => {
    withInvoice()
    const { user } = await editInvoice()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('Cancel with changes asks first, and can throw them away', async () => {
    withInvoice()
    const { user } = await editInvoice()
    const dialog = await openPart(user, 'Edit notes', 'Notes')
    await user.type(dialog.getByLabelText('Notes'), ' extra')
    await user.click(dialog.getByRole('button', { name: 'Done' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    let confirm = within(await screen.findByRole('dialog', { name: 'Discard your changes?' }))
    await user.click(confirm.getByRole('button', { name: 'Keep editing' }))
    expect(paper().getByText(/extra/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    confirm = within(await screen.findByRole('dialog', { name: 'Discard your changes?' }))
    await user.click(confirm.getByRole('button', { name: 'Discard changes' }))
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(paper().queryByText(/extra/)).not.toBeInTheDocument()
    expect(fakeConvex.handler(api.invoices.update)).not.toHaveBeenCalled()
  })

  it('leaving the page with unsaved changes asks first', async () => {
    withInvoice()
    fakeConvex.setQuery(api.invoices.list, [])
    const { user, router } = await editInvoice()
    const dialog = await openPart(user, 'Edit notes', 'Notes')
    await user.type(dialog.getByLabelText('Notes'), ' extra')
    await user.click(dialog.getByRole('button', { name: 'Done' }))
    await user.click(screen.getByRole('link', { name: 'Back to invoices' }))
    const confirm = within(await screen.findByRole('dialog', { name: 'Discard your changes?' }))
    expect(currentPath(router)).toBe('/invoices/inv1')
    await user.click(confirm.getByRole('button', { name: 'Discard changes' }))
    await waitFor(() => {
      expect(currentPath(router)).toBe('/')
    })
  })

  it('names the invoice in place (only for you)', async () => {
    withInvoice()
    const { user } = await editInvoice()
    await user.click(screen.getByRole('button', { name: 'Name this invoice' }))
    await user.type(
      screen.getByRole('textbox', { name: 'Invoice name' }),
      ' Astro – Oct 2026 {Enter}',
    )
    expect(screen.getByRole('heading', { name: 'Astro – Oct 2026', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('2026031')).toBeInTheDocument()
    // Never printed on the invoice.
    expect(paper().queryByText('Astro – Oct 2026')).not.toBeInTheDocument()

    // Escape keeps the old name.
    await user.click(screen.getByRole('button', { name: 'Rename invoice' }))
    await user.type(screen.getByRole('textbox', { name: 'Invoice name' }), ' x{Escape}')
    expect(screen.getByRole('heading', { name: 'Astro – Oct 2026', level: 1 })).toBeInTheDocument()
    expect(await save(user)).toMatchObject({ content: { name: 'Astro – Oct 2026' } })
  })

  it('never saves an amount it cannot read', async () => {
    withInvoice()
    const { user } = await editInvoice()
    const dialog = await openPart(user, 'Edit item 1', 'Item 1')
    const rate = dialog.getByLabelText(/Rate Per Session/)
    await user.clear(rate)
    await user.type(rate, '12x')
    expect(rate).toHaveAttribute('aria-invalid', 'true')
    const sent = (await save(user)) as { content: { items: { rateSen: number }[] } }
    expect(sent.content.items[0]?.rateSen).toBe(1200)
  })

  it('adds an item from "+ Add item"; an untouched one is dropped on close', async () => {
    withInvoice({ items: [] })
    const { user } = await editInvoice()
    await user.click(paper().getByRole('button', { name: '+ Add item' }))
    let dialog = within(await screen.findByRole('dialog', { name: 'Item 1' }))
    await user.click(dialog.getByRole('button', { name: 'Done' }))
    expect(paper().queryByRole('button', { name: 'Edit item 1' })).not.toBeInTheDocument()

    await user.click(paper().getByRole('button', { name: '+ Add item' }))
    dialog = within(await screen.findByRole('dialog', { name: 'Item 1' }))
    await user.type(dialog.getByLabelText('Item 1 Description'), 'Voice-over')
    await user.click(dialog.getByRole('button', { name: 'Done' }))
    expect(paper().getByRole('cell', { name: 'Voice-over' })).toBeInTheDocument()
  })

  it('suggests remembered items while typing and fills in the price', async () => {
    withInvoice({ items: [] })
    fakeConvex.setQuery(api.items.list, [
      itemDoc(),
      itemDoc({
        _id: 'item2' as never,
        key: 'voice-over',
        description: 'Voice-over',
        rateSen: 9000,
        quantity: 1,
      }),
    ])
    const { user } = await editInvoice()
    await user.click(paper().getByRole('button', { name: '+ Add item' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Item 1' }))
    const description = dialog.getByLabelText('Item 1 Description')
    await user.type(description, 'announ')
    const options = within(screen.getByRole('listbox', { name: 'Past items' })).getAllByRole(
      'option',
    )
    expect(options).toHaveLength(1)
    await user.keyboard('{ArrowDown}{Enter}')
    expect(description).toHaveValue('FULL TIME ANNOUNCER (20 days)')
    expect(dialog.getByLabelText(/^Rate Per Session/)).toHaveValue('250.00')
    expect(dialog.getByLabelText('Quantity (session)')).toHaveValue('20')
  })

  it('a taken number keeps you editing and shows why in the Number & dates popup', async () => {
    withInvoice()
    fakeConvex
      .handler(api.invoices.update)
      .mockRejectedValue(new ConvexError({ code: 'number_taken', field: 'number' }))
    const { user } = await editInvoice()
    const dialog = await openPart(user, 'Edit invoice number and dates', 'Number & dates')
    await user.clear(dialog.getByLabelText('Invoice number'))
    await user.type(dialog.getByLabelText('Invoice number'), '2026030')
    await save(user)
    const again = within(await screen.findByRole('dialog', { name: 'Number & dates' }))
    expect(again.getByText('Another invoice already uses this number.')).toBeInTheDocument()
    expect(again.getByLabelText('Invoice number')).toHaveAttribute('aria-invalid', 'true')
    // Still editing: nothing was lost.
    await user.click(again.getByRole('button', { name: 'Done' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('moves the due date with the payment terms chips', async () => {
    withInvoice()
    const { user } = await editInvoice()
    const dialog = await openPart(user, 'Edit invoice number and dates', 'Number & dates')
    await user.click(dialog.getByRole('button', { name: '14 days' }))
    expect(dialog.getByLabelText('Due date')).toHaveValue('2026-10-21')
    await user.click(dialog.getByRole('button', { name: 'None' }))
    expect(dialog.getByLabelText('Due date')).toHaveValue('')
  })

  it('fills "Bill to" from a saved client, including their usual notes', async () => {
    withInvoice({ billTo: { name: '', address: '', attention: '' }, notes: '' })
    fakeConvex.setQuery(api.clients.list, [
      {
        _id: 'c1',
        _creationTime: 0,
        userId: 'user1',
        name: 'Acme Sdn Bhd',
        address: 'Jalan Ampang',
        attention: 'Finance',
        email: '',
        notes: 'Vendor code: 42',
      },
    ])
    const { user } = await editInvoice()
    expect(paper().getByText('Choose a client')).toBeInTheDocument()
    const dialog = await openPart(user, "Edit who it's billed to", 'Bill to')
    await user.selectOptions(dialog.getByLabelText('Client'), 'c1')
    expect(dialog.getByText('Attention: Finance')).toBeInTheDocument()
    expect(paper().getByText('Acme Sdn Bhd')).toBeInTheDocument()
    expect(paper().getByText('Vendor code: 42')).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Edit for this invoice' }))
    expect(dialog.getByLabelText('Name')).toHaveValue('Acme Sdn Bhd')
  })

  it('changes the layout from "Look & columns"', async () => {
    withInvoice()
    const { user } = await editInvoice()
    await user.click(screen.getByRole('button', { name: 'Look & columns' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Look & columns' }))
    await user.click(dialog.getByRole('button', { name: 'Bold' }))
    expect(previewSection().querySelector('.tpl-bold')).not.toBeNull()
    expect(await save(user)).toMatchObject({ content: { layout: 'bold' } })
  })

  it('adds notes and, once paid, a PAID stamp', async () => {
    withInvoice({ notes: '', status: 'paid', paidAt: '2026-10-20' })
    const { user } = await editInvoice()
    await user.click(paper().getByRole('button', { name: '+ Add notes' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Notes' }))
    await user.type(dialog.getByLabelText('Notes'), 'Thank you!')
    await user.click(dialog.getByRole('checkbox', { name: /PAID/ }))
    expect(paper().getByText('Thank you!')).toBeInTheDocument()
    expect(paper().getByLabelText('Paid on 20/10/2026')).toBeInTheDocument()
  })

  it('switching template restyles the draft and is saved with it', async () => {
    withInvoice()
    fakeConvex.setQuery(api.templates.list, [
      templateDoc(),
      templateDoc({ _id: 'tpl2' as never, name: 'Voice-over studio', layout: 'bold' }),
    ])
    const { user } = await editInvoice()
    await user.selectOptions(screen.getByLabelText('Template'), 'tpl2')
    expect(previewSection().querySelector('.tpl-bold')).not.toBeNull()
    expect(fakeConvex.handler(api.invoices.update)).not.toHaveBeenCalled()
    expect(await save(user)).toMatchObject({ templateId: 'tpl2', content: { layout: 'bold' } })
  })
})
