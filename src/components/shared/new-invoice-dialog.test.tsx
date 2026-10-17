import { api } from '@convex/_generated/api'
import { waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { fakeConvex } from '@/testing/fake-convex'
import { bankDoc, businessDoc, itemDoc, profileResult, templateDoc } from '@/testing/fixtures'
import { currentPath, expectNoA11yViolations, renderApp, screen } from '@/testing/render-app'

const clients = [
  {
    _id: 'c1',
    _creationTime: 0,
    userId: 'user1',
    name: 'Acme',
    address: '',
    attention: '',
    email: '',
    notes: '',
  },
  {
    _id: 'c2',
    _creationTime: 0,
    userId: 'user1',
    name: 'Astro Radio',
    address: 'Bukit Jalil',
    attention: '',
    email: '',
    notes: 'Vendor code: 1029934',
  },
]

const studioB = businessDoc({ _id: 'biz2' as never, name: 'Studio B', isDefault: false })
const maybank = bankDoc({
  _id: 'bank2' as never,
  bankName: 'Maybank',
  accountNumber: '555',
  isDefault: false,
})

function setUp({
  templates = [templateDoc()],
  profile = profileResult(),
  businesses = [businessDoc(), studioB],
  banks = [bankDoc(), maybank],
}: {
  templates?: ReturnType<typeof templateDoc>[]
  profile?: ReturnType<typeof profileResult> | null
  businesses?: ReturnType<typeof businessDoc>[]
  banks?: ReturnType<typeof bankDoc>[]
} = {}) {
  fakeConvex.setQuery(api.templates.list, templates)
  fakeConvex.setQuery(api.clients.list, clients)
  fakeConvex.setQuery(api.profiles.get, profile)
  fakeConvex.setQuery(api.businesses.list, businesses)
  fakeConvex.setQuery(api.bankAccounts.list, banks)
  fakeConvex.setQuery(api.items.list, [])
}

async function openPopup() {
  fakeConvex.setQuery(api.invoices.list, [])
  const app = await renderApp('/')
  await app.user.click(screen.getAllByRole('button', { name: /New invoice/ })[0]!)
  const dialog = await screen.findByRole('dialog', { name: 'New invoice' })
  return { ...app, dialog: within(dialog) }
}

/** The small invoice beside the fields (hidden from screen readers, so queried directly). */
function preview() {
  const element = document.querySelector<HTMLElement>('[data-testid="new-invoice-preview"]')
  if (!element) throw new Error('preview missing')
  return within(element)
}

describe('New invoice popup', () => {
  it('asks for a template first when there is none', async () => {
    setUp({ templates: [], profile: null })
    fakeConvex.handler(api.templates.create).mockResolvedValue('tplNew')
    const { user, dialog, router } = await openPopup()
    expect(dialog.getByText(/First, set up your invoice template/)).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Set up template' }))
    await waitFor(() => {
      expect(currentPath(router)).toBe('/templates/tplNew')
    })
  })

  it('pre-picks everything and creates the invoice', async () => {
    setUp({ profile: profileResult({ lastClientId: 'c2' }) })
    fakeConvex.handler(api.invoices.create).mockResolvedValue('new1')
    const { user, dialog, router } = await openPopup()
    expect(dialog.getByLabelText('Template')).toHaveValue('tpl1')
    expect(dialog.getByLabelText('Client')).toHaveValue('c2')
    expect(dialog.getByLabelText('Your business')).toHaveValue('biz1')
    expect(dialog.getByLabelText('Your bank account')).toHaveValue('bank1')
    expect(dialog.getByLabelText('Invoice date')).toHaveValue('2026-10-15')
    expect(dialog.getByLabelText('Payment due')).toHaveValue('none')
    await expectNoA11yViolations()

    await user.click(dialog.getByRole('button', { name: 'Create invoice' }))
    expect(fakeConvex.handler(api.invoices.create)).toHaveBeenCalledWith({
      today: '2026-10-15',
      templateId: 'tpl1',
      clientId: 'c2',
      businessId: 'biz1',
      bankAccountId: 'bank1',
      issueDate: '2026-10-15',
      dueDate: '',
      // An untouched item row is left out; the client's usual notes become the remark.
      items: [],
      discountSen: 0,
      taxRateBps: 0,
      taxLabel: 'SST',
      notes: 'Vendor code: 1029934',
    })
    await waitFor(() => {
      expect(currentPath(router)).toBe('/invoices/new1')
    })
  })

  it('previews the invoice as it will be made', async () => {
    setUp({ profile: profileResult({ lastClientId: 'c2' }) })
    const { user, dialog } = await openPopup()
    expect(preview().getByText('Astro Radio')).toBeInTheDocument()
    expect(preview().getByText('Vendor code: 1029934')).toBeInTheDocument()
    expect(preview().getByText(/2026032/)).toBeInTheDocument()
    expect(preview().getByText(/Public Bank/)).toBeInTheDocument()

    await user.selectOptions(dialog.getByLabelText('Your business'), 'biz2')
    await user.selectOptions(dialog.getByLabelText('Your bank account'), 'bank2')
    expect(preview().getByText('Studio B')).toBeInTheDocument()
    expect(preview().getByText(/Maybank/)).toBeInTheDocument()
  })

  it("previews a brand-new account's first number", async () => {
    setUp({ profile: null })
    await openPopup()
    expect(preview().getByText(/2026001/)).toBeInTheDocument()
  })

  it('lets you pick another date, template, client, business and bank', async () => {
    setUp({
      templates: [templateDoc(), templateDoc({ _id: 'tpl2' as never, name: 'Voice-over' })],
      profile: profileResult({ lastTemplateId: 'tpl2' }),
    })
    const { user, dialog } = await openPopup()
    expect(dialog.getByLabelText('Template')).toHaveValue('tpl2')

    await user.selectOptions(dialog.getByLabelText('Template'), 'tpl1')
    // No profile memory of a client: the first saved one is picked; choose another.
    expect(dialog.getByLabelText('Client')).toHaveValue('c1')
    expect(
      within(dialog.getByLabelText('Client')).queryByRole('option', { name: 'New client' }),
    ).not.toBeInTheDocument()
    await user.selectOptions(dialog.getByLabelText('Client'), 'c2')
    await user.selectOptions(dialog.getByLabelText('Your business'), 'biz2')
    await user.selectOptions(dialog.getByLabelText('Your bank account'), 'bank2')
    const date = dialog.getByLabelText('Invoice date')
    await user.clear(date)
    await user.type(date, '2026-10-01')
    await user.selectOptions(dialog.getByLabelText('Payment due'), '30')
    expect(dialog.getByLabelText('Payment due')).toHaveAccessibleDescription('Due 31/10/2026')
    await user.click(dialog.getByRole('button', { name: 'Create invoice' }))
    expect(fakeConvex.handler(api.invoices.create)).toHaveBeenCalledWith({
      today: '2026-10-15',
      templateId: 'tpl1',
      clientId: 'c2',
      businessId: 'biz2',
      bankAccountId: 'bank2',
      issueDate: '2026-10-01',
      dueDate: '2026-10-31',
      items: [],
      discountSen: 0,
      taxRateBps: 0,
      taxLabel: 'SST',
      // The chosen client's usual notes become the remark.
      notes: 'Vendor code: 1029934',
    })
  })

  it('follows the template for business and bank until you change them', async () => {
    setUp({
      templates: [
        templateDoc(),
        templateDoc({
          _id: 'tpl2' as never,
          name: 'Voice-over',
          businessId: 'biz2' as never,
          bankAccountId: 'bank2' as never,
        }),
      ],
      profile: profileResult({ lastTemplateId: 'tpl1' }),
    })
    const { user, dialog } = await openPopup()
    await user.selectOptions(dialog.getByLabelText('Your business'), 'biz2')
    await user.selectOptions(dialog.getByLabelText('Template'), 'tpl2')
    expect(dialog.getByLabelText('Your business')).toHaveValue('biz2')
    expect(dialog.getByLabelText('Your bank account')).toHaveValue('bank2')
    // Switching template again goes back to that template's choice.
    await user.selectOptions(dialog.getByLabelText('Template'), 'tpl1')
    expect(dialog.getByLabelText('Your business')).toHaveValue('biz1')
  })

  it('takes items (with past-item suggestions), a remark, discount and tax', async () => {
    setUp()
    fakeConvex.setQuery(api.items.list, [itemDoc()])
    const { user, dialog } = await openPopup()
    // Discount and tax start unticked, with no boxes shown.
    expect(dialog.getByRole('checkbox', { name: 'Discount' })).not.toBeChecked()
    expect(dialog.getByRole('checkbox', { name: 'Tax' })).not.toBeChecked()
    expect(dialog.queryByLabelText('Tax %')).not.toBeInTheDocument()
    // Slim item rows: reordering is left to the invoice page.
    expect(dialog.queryByRole('button', { name: /Move item/ })).not.toBeInTheDocument()

    await user.type(dialog.getByLabelText('Item 1 Description'), 'announ')
    await user.click(screen.getByRole('option', { name: /FULL TIME ANNOUNCER/ }))
    expect(dialog.getByLabelText('Quantity (session)')).toHaveValue('20')
    await user.click(dialog.getByRole('button', { name: 'Add item' }))
    await user.type(dialog.getByLabelText('Item 2 Description'), 'Voice-over')
    await user.click(dialog.getByRole('button', { name: 'Remove item 2' }))
    expect(dialog.queryByLabelText('Item 2 Description')).not.toBeInTheDocument()

    await user.type(dialog.getByLabelText('Remark'), 'Thank you!')
    await user.click(dialog.getByRole('checkbox', { name: 'Discount' }))
    await user.type(dialog.getByLabelText(/Discount amount/), '100')
    await user.click(dialog.getByRole('checkbox', { name: 'Tax' }))
    await user.type(dialog.getByLabelText('Tax %'), '8')
    expect(preview().getByText('SST (8%)')).toBeInTheDocument()
    expect(preview().getByText('Thank you!')).toBeInTheDocument()

    await user.click(dialog.getByRole('button', { name: 'Create invoice' }))
    expect(fakeConvex.handler(api.invoices.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            description: 'FULL TIME ANNOUNCER (20 days)',
            rateSen: 25000,
            quantity: 20,
          }),
        ],
        notes: 'Thank you!',
        discountSen: 10000,
        taxRateBps: 800,
        taxLabel: 'SST',
      }),
    )
  })

  it('unticking discount or tax leaves it off the invoice', async () => {
    setUp()
    const { user, dialog } = await openPopup()
    await user.click(dialog.getByRole('checkbox', { name: 'Tax' }))
    await user.type(dialog.getByLabelText('Tax %'), '8')
    await user.click(dialog.getByRole('checkbox', { name: 'Tax' }))
    await user.click(dialog.getByRole('button', { name: 'Create invoice' }))
    expect(fakeConvex.handler(api.invoices.create)).toHaveBeenCalledWith(
      expect.objectContaining({ taxRateBps: 0, discountSen: 0 }),
    )
  })

  it('takes an optional name, only for you', async () => {
    setUp()
    const { user, dialog } = await openPopup()
    await user.type(dialog.getByLabelText('Invoice name (optional)'), ' Astro – Oct 2026 ')
    await user.click(dialog.getByRole('button', { name: 'Create invoice' }))
    expect(fakeConvex.handler(api.invoices.create)).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Astro – Oct 2026' }),
    )
  })

  it('takes a custom due date, not before the invoice date', async () => {
    setUp()
    const { user, dialog } = await openPopup()
    await user.selectOptions(dialog.getByLabelText('Payment due'), 'custom')
    // The list turns into a date box in the same place, ready to type in.
    const due = dialog.getByLabelText('Due date')
    expect(due).toHaveFocus()
    expect(dialog.queryByLabelText('Payment due')).not.toBeInTheDocument()
    expect(dialog.getByRole('button', { name: 'Create invoice' })).toBeDisabled()
    await user.type(due, '2026-10-01')
    expect(dialog.getByText('Pick a due date on or after the invoice date.')).toBeInTheDocument()
    await user.clear(due)
    await user.type(due, '2026-12-31')
    // The preview shows it too.
    expect(preview().getByText(/31\/12\/2026/)).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Create invoice' }))
    expect(fakeConvex.handler(api.invoices.create)).toHaveBeenCalledWith(
      expect.objectContaining({ dueDate: '2026-12-31' }),
    )
  })

  it('goes back from a custom due date to the list', async () => {
    setUp()
    const { user, dialog } = await openPopup()
    await user.selectOptions(dialog.getByLabelText('Payment due'), 'custom')
    await user.click(dialog.getByRole('button', { name: 'Choose from list' }))
    expect(dialog.getByLabelText('Payment due')).toHaveValue('none')
  })

  it('needs a date', async () => {
    setUp()
    const { user, dialog } = await openPopup()
    await user.clear(dialog.getByLabelText('Invoice date'))
    expect(dialog.getByText('Pick a date.')).toBeInTheDocument()
    expect(dialog.getByRole('button', { name: 'Create invoice' })).toBeDisabled()
  })

  it('with no business or bank account yet, adds one right there', async () => {
    setUp({ businesses: [], banks: [] })
    const { user, dialog } = await openPopup()
    expect(dialog.getByText('No business yet')).toBeInTheDocument()
    expect(dialog.getByText('No bank account yet')).toBeInTheDocument()
    await expectNoA11yViolations()

    await user.click(dialog.getByRole('button', { name: 'Add bank account' }))
    const add = within(await screen.findByRole('dialog', { name: 'Add bank account' }))
    await user.type(add.getByLabelText('Bank'), 'Maybank')
    await user.click(add.getByRole('button', { name: 'Save' }))
    expect(fakeConvex.handler(api.bankAccounts.create)).toHaveBeenCalledWith(
      expect.objectContaining({ bankName: 'Maybank' }),
    )
    // Back on the New invoice popup, which stays open.
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Add bank account' })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('dialog', { name: 'New invoice' })).toBeInTheDocument()

    await user.click(dialog.getByRole('button', { name: 'Add business' }))
    expect(await screen.findByRole('dialog', { name: 'Add business' })).toBeInTheDocument()
  })

  it('adds another business, bank account or client from the end of each list, and picks it', async () => {
    setUp()
    // Like the server: the new business shows up in the list straight away.
    fakeConvex.handler(api.businesses.create).mockImplementation(() => {
      fakeConvex.setQuery(api.businesses.list, [
        businessDoc(),
        studioB,
        businessDoc({ _id: 'biz9' as never, name: 'Studio C', isDefault: false }),
      ])
      return 'biz9'
    })
    const { user, dialog } = await openPopup()
    for (const [label, option] of [
      ['Your bank account', '+ Add bank account…'],
      ['Client', '+ Add client…'],
    ] as const) {
      expect(
        within(dialog.getByLabelText(label)).getByRole('option', { name: option }),
      ).toBeInTheDocument()
    }
    await user.selectOptions(dialog.getByLabelText('Your business'), '+ Add business…')
    // The list keeps its choice while the form is open.
    expect(dialog.getByLabelText('Your business')).toHaveValue('biz1')
    const add = within(await screen.findByRole('dialog', { name: 'Add business' }))
    await user.type(add.getByLabelText('Business name'), 'Studio C')
    await user.click(add.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Add business' })).not.toBeInTheDocument()
    })
    expect(dialog.getByLabelText('Your business')).toHaveValue('biz9')
  })

  it('with no saved clients, adds one right there and picks it', async () => {
    setUp()
    fakeConvex.setQuery(api.clients.list, [])
    // Like the server: the new client shows up in the list straight away.
    fakeConvex.handler(api.clients.create).mockImplementation(() => {
      fakeConvex.setQuery(api.clients.list, [{ ...clients[0]!, _id: 'c9', name: 'Astro Radio' }])
      return 'c9'
    })
    const { user, dialog } = await openPopup()
    expect(dialog.getByText('No saved clients yet')).toBeInTheDocument()
    await user.click(dialog.getByRole('button', { name: 'Add client' }))
    const add = within(await screen.findByRole('dialog', { name: 'New client' }))
    await user.type(add.getByLabelText('Name'), 'Astro Radio')
    await user.click(add.getByRole('button', { name: 'Add client' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'New client' })).not.toBeInTheDocument()
    })
    expect(dialog.getByLabelText('Client')).toHaveValue('c9')
    await user.click(dialog.getByRole('button', { name: 'Create invoice' }))
    expect(fakeConvex.handler(api.invoices.create)).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'c9' }),
    )
  })

  it('ignores a remembered template that was deleted', async () => {
    setUp({
      templates: [templateDoc(), templateDoc({ _id: 'tpl2' as never, name: 'Voice-over' })],
      profile: profileResult({ lastTemplateId: 'gone' }),
    })
    const { dialog } = await openPopup()
    expect(dialog.getByLabelText('Template')).toHaveValue('tpl1')
  })
})
