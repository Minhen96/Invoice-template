import { api } from '@convex/_generated/api'
import { EMPTY_BUSINESS } from '@convex/lib/defaults'
import { ConvexError } from 'convex/values'
import { waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { fakeAuth, fakeConvex } from '@/testing/fake-convex'
import { bankDoc, business, businessDoc, listRow, profileResult } from '@/testing/fixtures'
import { currentPath, expectNoA11yViolations, renderApp, screen } from '@/testing/render-app'

const viewer = { email: 'me@example.com', name: '', image: null, hasPassword: true }

afterEach(() => {
  vi.unstubAllGlobals()
})

function captureDownloads() {
  const created: Blob[] = []
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: (blob: Blob) => {
      created.push(blob)
      return 'blob:test'
    },
    revokeObjectURL: () => undefined,
  })
  return created
}

/** The row's button (title + summary) for a section. */
function row(title: string) {
  return screen.getByRole('button', { name: new RegExp(`^${title}`) })
}

function withLists({
  businesses = [businessDoc()],
  banks = [bankDoc()],
}: { businesses?: unknown[]; banks?: unknown[] } = {}) {
  fakeConvex.setQuery(api.profiles.get, profileResult())
  fakeConvex.setQuery(api.businesses.list, businesses)
  fakeConvex.setQuery(api.bankAccounts.list, banks)
}

describe('account page', () => {
  it('opens from the avatar: one line for your business, one for your bank account', async () => {
    withLists()
    fakeConvex.setQuery(api.account.viewer, viewer)
    fakeConvex.setQuery(api.invoices.list, [])
    const { user, router } = await renderApp('/')
    await user.click(screen.getByRole('link', { name: 'Account' }))
    expect(currentPath(router)).toBe('/account')

    expect(screen.getByText('me@example.com')).toBeInTheDocument()
    const section = within(screen.getByRole('region', { name: 'Invoice details' }))
    expect(section.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'BusinessLIM KAI XIN TRADING AS LIM KAI XIN',
      'Bank accountPublic Bank',
      'Invoice numbersNext invoice: 2026032',
    ])
    // Nothing is open, and nothing is missing.
    expect(screen.queryByLabelText('Business name')).not.toBeInTheDocument()
    expect(screen.queryByText('Incomplete')).not.toBeInTheDocument()
    await expectNoA11yViolations()
  })

  it('lists your businesses in a popup: the default marked, pick one or add another', async () => {
    withLists({
      businesses: [
        businessDoc(),
        businessDoc({ _id: 'biz2' as never, name: 'MIN HEN STUDIO', isDefault: false }),
      ],
    })
    const { user } = await renderApp('/account')
    expect(row('Business')).toHaveTextContent('LIM KAI XIN TRADING AS LIM KAI XIN + 1 more')
    await user.click(row('Business'))
    let list = within(await screen.findByRole('dialog', { name: 'Your businesses' }))
    expect(list.getByRole('button', { name: /^LIM KAI XIN/ })).toHaveTextContent('Default')
    expect(list.getByRole('button', { name: /^MIN HEN STUDIO/ })).not.toHaveTextContent('Default')
    await expectNoA11yViolations()

    await user.click(list.getByRole('button', { name: 'Add business' }))
    expect(await screen.findByRole('dialog', { name: 'Add business' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Your businesses' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')

    await user.click(row('Business'))
    list = within(await screen.findByRole('dialog', { name: 'Your businesses' }))
    await user.click(list.getByRole('button', { name: /^MIN HEN STUDIO/ }))
    expect(await screen.findByRole('dialog', { name: 'Edit business' })).toBeInTheDocument()
  })

  it('tags what an invoice still needs, saying what is missing', async () => {
    withLists({ businesses: [], banks: [bankDoc({ bankName: '', accountNumber: '' })] })
    const { user } = await renderApp('/account')
    expect(row('Business')).toHaveTextContent('Incomplete')
    expect(row('Business')).toHaveTextContent('Add the business you invoice as.')
    expect(row('Bank account')).toHaveTextContent('Incomplete')
    expect(row('Invoice numbers')).not.toHaveTextContent('Incomplete')
    await user.click(row('Bank account'))
    const list = within(await screen.findByRole('dialog', { name: 'Your bank accounts' }))
    expect(list.getByRole('button', { name: /^Bank account/ })).toHaveTextContent(
      'Add bank and account number.',
    )
  })

  it('with no business yet, goes straight to adding one', async () => {
    withLists({ businesses: [] })
    const { user } = await renderApp('/account')
    await user.click(row('Business'))
    const dialog = within(await screen.findByRole('dialog', { name: 'Add business' }))
    await user.type(dialog.getByLabelText('Business name'), 'Studio A')
    await user.type(dialog.getByLabelText('Address'), 'Kuala Lumpur')
    await user.click(dialog.getByRole('button', { name: 'Save' }))
    expect(fakeConvex.handler(api.businesses.create)).toHaveBeenCalledWith({
      ...EMPTY_BUSINESS,
      name: 'Studio A',
      address: 'Kuala Lumpur',
      makeDefault: false,
    })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('edits a business, can make it the default, or delete it', async () => {
    withLists({
      businesses: [
        businessDoc(),
        businessDoc({ _id: 'biz2' as never, name: 'MIN HEN STUDIO', isDefault: false }),
      ],
    })
    const { user } = await renderApp('/account')
    const openStudio = async () => {
      await user.click(row('Business'))
      const list = within(await screen.findByRole('dialog', { name: 'Your businesses' }))
      await user.click(list.getByRole('button', { name: /^MIN HEN STUDIO/ }))
      return within(await screen.findByRole('dialog', { name: 'Edit business' }))
    }
    let dialog = await openStudio()
    await user.click(dialog.getByRole('checkbox', { name: 'Use as default' }))
    await user.click(dialog.getByRole('button', { name: 'Save' }))
    expect(fakeConvex.handler(api.businesses.update)).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'biz2', name: 'MIN HEN STUDIO' }),
    )
    expect(fakeConvex.handler(api.businesses.setDefault)).toHaveBeenCalledWith({ id: 'biz2' })

    dialog = await openStudio()
    await user.click(dialog.getByRole('button', { name: 'Delete' }))
    expect(fakeConvex.handler(api.businesses.remove)).toHaveBeenCalledWith({ id: 'biz2' })
  })

  it('the default has no "Use as default" box', async () => {
    withLists()
    const { user } = await renderApp('/account')
    await user.click(row('Business'))
    const list = within(await screen.findByRole('dialog', { name: 'Your businesses' }))
    await user.click(list.getByRole('button', { name: /^LIM KAI XIN/ }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Edit business' }))
    expect(dialog.queryByRole('checkbox', { name: 'Use as default' })).not.toBeInTheDocument()
  })

  it('picks the ID type from a list, or types your own', async () => {
    withLists({ banks: [] })
    const { user } = await renderApp('/account')
    await user.click(row('Bank account'))
    const dialog = within(await screen.findByRole('dialog', { name: 'Add bank account' }))
    expect(dialog.getByLabelText('ID type')).toHaveValue('IC No')
    expect(dialog.getByText('Printed as “IC No: …”')).toBeInTheDocument()

    await user.selectOptions(dialog.getByLabelText('ID type'), 'Passport No')
    expect(dialog.getByText('Printed as “Passport No: …”')).toBeInTheDocument()

    await user.selectOptions(dialog.getByLabelText('ID type'), 'other')
    await user.type(dialog.getByLabelText('ID type name'), 'Tax No')
    await user.type(dialog.getByLabelText('ID number (optional)'), 'T123')
    await user.type(dialog.getByLabelText('Account name'), 'Me')
    await user.click(dialog.getByRole('button', { name: 'Save' }))
    expect(fakeConvex.handler(api.bankAccounts.create)).toHaveBeenCalledWith(
      expect.objectContaining({ idLabel: 'Tax No', idNumber: 'T123', accountName: 'Me' }),
    )
  })

  it('adds a second bank account from the list', async () => {
    withLists()
    const { user } = await renderApp('/account')
    await user.click(row('Bank account'))
    const list = within(await screen.findByRole('dialog', { name: 'Your bank accounts' }))
    await user.click(list.getByRole('button', { name: 'Add bank account' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Add bank account' }))
    await user.type(dialog.getByLabelText('Bank'), 'Maybank')
    await user.click(dialog.getByRole('button', { name: 'Cancel' }))
    expect(fakeConvex.handler(api.bankAccounts.create)).not.toHaveBeenCalled()
  })

  it('saves a new next number', async () => {
    withLists()
    const { user } = await renderApp('/account')
    await user.click(row('Invoice numbers'))
    const dialog = within(await screen.findByRole('dialog', { name: 'Invoice numbers' }))
    await user.clear(dialog.getByLabelText('Next invoice number'))
    await user.type(dialog.getByLabelText('Next invoice number'), 'INV-100')
    await user.click(dialog.getByRole('button', { name: 'Save' }))
    expect(fakeConvex.handler(api.profiles.update)).toHaveBeenCalledWith({
      today: '2026-10-15',
      nextNumber: 'INV-100',
    })
  })

  it('old Settings links land on Account', async () => {
    fakeConvex.setQuery(api.profiles.get, profileResult())
    const { router } = await renderApp('/settings')
    expect(currentPath(router)).toBe('/account')
  })
})

describe('sign-in & data', () => {
  it('changes the password and explains a wrong current one', async () => {
    fakeConvex.setQuery(api.profiles.get, profileResult())
    fakeConvex.setQuery(api.account.viewer, viewer)
    fakeConvex
      .handler(api.account.changePassword)
      .mockRejectedValueOnce(new ConvexError({ code: 'wrong_password' }))
    const { user } = await renderApp('/account')
    await user.click(row('Password'))
    const dialog = await screen.findByRole('dialog', { name: 'Change password' })
    await user.type(within(dialog).getByLabelText('Current password'), 'old-password')
    await user.type(within(dialog).getByLabelText('New password'), 'new-password-1')
    await user.click(within(dialog).getByRole('button', { name: 'Change password' }))
    expect(await within(dialog).findByText('That password is not right.')).toBeInTheDocument()
  })

  it('has no password row for Google-only accounts', async () => {
    fakeConvex.setQuery(api.profiles.get, profileResult())
    fakeConvex.setQuery(api.account.viewer, { ...viewer, hasPassword: false })
    await renderApp('/account')
    expect(screen.queryByRole('button', { name: /^Password/ })).not.toBeInTheDocument()
  })

  it('logs out other devices, and this one', async () => {
    fakeConvex.setQuery(api.profiles.get, profileResult())
    const { user } = await renderApp('/account')
    await user.click(screen.getByRole('button', { name: 'Log out others' }))
    expect(fakeConvex.handler(api.account.signOutOtherDevices)).toHaveBeenCalled()
    expect(await screen.findByText('Other devices are logged out')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Log out$/ }))
    expect(fakeAuth.signOut).toHaveBeenCalled()
  })

  it('exports the invoice list as CSV', async () => {
    fakeConvex.setQuery(api.profiles.get, profileResult())
    fakeConvex.setQuery(api.invoices.list, [listRow()])
    const created = captureDownloads()
    const { user } = await renderApp('/account')
    await user.click(row('Your data'))
    await user.click(await screen.findByRole('button', { name: /Invoice list \(CSV\)/ }))
    await waitFor(() => {
      expect(created).toHaveLength(1)
    })
    const text = await created[0]!.text()
    expect(text).toContain('Number,Client,Issued,Due,Currency,Total,Status,Paid on')
    expect(text).toContain('2026031,Astro Radio Sdn Bhd,2026-10-07,2026-11-06,RM,5000.00,unpaid,')
  })

  it('downloads a full JSON backup', async () => {
    fakeConvex.setQuery(api.profiles.get, profileResult())
    fakeConvex.setQuery(api.backup.exportData, {
      version: 4,
      business,
      payment: null,
      nextNumber: '2026032',
      templates: [],
      items: [],
      clients: [],
      invoices: [],
    })
    const created = captureDownloads()
    const { user } = await renderApp('/account')
    await user.click(row('Your data'))
    await user.click(await screen.findByRole('button', { name: /Full backup/ }))
    await waitFor(() => {
      expect(created).toHaveLength(1)
    })
    expect(JSON.parse(await created[0]!.text())).toMatchObject({ version: 4, invoices: [] })
  })
})
