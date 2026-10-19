import { api } from '@convex/_generated/api'
import { DEFAULT_TEMPLATE } from '@convex/lib/defaults'
import { waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { fakeConvex } from '@/testing/fake-convex'
import { bankDoc, businessDoc, templateDoc } from '@/testing/fixtures'
import { currentPath, expectNoA11yViolations, renderApp, screen } from '@/testing/render-app'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('templates page', () => {
  it('explains templates and opens a new one without storing anything yet', async () => {
    fakeConvex.setQuery(api.templates.list, [])
    const { user, router } = await renderApp('/templates')
    expect(screen.getByText('No templates yet.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Create your first template/ }))
    await waitFor(() => {
      expect(currentPath(router)).toBe('/templates/new')
    })
    expect(fakeConvex.handler(api.templates.create)).not.toHaveBeenCalled()
  })

  it('lists templates with a preview', async () => {
    fakeConvex.setQuery(api.templates.list, [templateDoc()])
    await renderApp('/templates')
    expect(screen.getByRole('link', { name: 'Astro announcer' })).toHaveAttribute(
      'href',
      '/templates/tpl1',
    )
    expect(screen.getByText('Blush · INVOICE')).toBeInTheDocument()
    await expectNoA11yViolations()
  })

  it('searches templates by name or layout', async () => {
    fakeConvex.setQuery(api.templates.list, [
      templateDoc(),
      templateDoc({ _id: 'tpl2' as never, name: 'Voice-over', layout: 'bold' }),
    ])
    const { user } = await renderApp('/templates')
    const search = screen.getByRole('searchbox', { name: 'Search templates' })
    await user.type(search, 'bold')
    expect(screen.getByRole('link', { name: 'Voice-over' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Astro announcer' })).not.toBeInTheDocument()
    await user.clear(search)
    await user.type(search, 'zzz')
    expect(screen.getByText('No templates match.')).toBeInTheDocument()
  })

  it('deletes a template after confirming', async () => {
    fakeConvex.setQuery(api.templates.list, [
      templateDoc(),
      templateDoc({ _id: 'tpl2' as never, name: 'Other' }),
    ])
    const { user } = await renderApp('/templates')
    await user.click(screen.getByRole('button', { name: 'Actions for Astro announcer' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete Astro announcer?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete template' }))
    expect(fakeConvex.handler(api.templates.remove)).toHaveBeenCalledWith({ id: 'tpl1' })
  })

  it('keeps your last template: no Delete for it', async () => {
    fakeConvex.setQuery(api.templates.list, [templateDoc()])
    const { user } = await renderApp('/templates')
    await user.click(screen.getByRole('button', { name: 'Actions for Astro announcer' }))
    expect(await screen.findByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
  })
})

describe('template business & bank account', () => {
  it('uses the defaults unless the template picks another', async () => {
    fakeConvex.setQuery(api.templates.get, templateDoc())
    fakeConvex.setQuery(api.businesses.list, [
      businessDoc(),
      businessDoc({ _id: 'biz2' as never, name: 'MIN HEN STUDIO', isDefault: false }),
    ])
    fakeConvex.setQuery(api.bankAccounts.list, [bankDoc()])
    const { user } = await renderApp('/templates/tpl1')
    const preview = () => within(screen.getByRole('region', { name: 'Preview' }))
    expect(screen.getByLabelText('Business')).toHaveValue('')
    expect(
      within(screen.getByLabelText('Business')).getByRole('option', { name: /^Default/ }),
    ).toHaveTextContent('Default — LIM KAI XIN TRADING AS LIM KAI XIN')
    expect(preview().getByText('LIM KAI XIN TRADING AS LIM KAI XIN')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Business'), 'biz2')
    expect(preview().getByText('MIN HEN STUDIO')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(fakeConvex.handler(api.templates.update).mock.calls.at(-1)?.[0]).toMatchObject({
      businessId: 'biz2',
      bankAccountId: undefined,
    })
  })

  it('points to Account when there is no business yet', async () => {
    fakeConvex.setQuery(api.templates.get, templateDoc())
    fakeConvex.setQuery(api.businesses.list, [])
    fakeConvex.setQuery(api.bankAccounts.list, [])
    await renderApp('/templates/tpl1')
    expect(screen.getAllByRole('link', { name: 'Add one in Account' })).toHaveLength(2)
  })
})

describe('template editor', () => {
  it('shows a friendly message for a missing template', async () => {
    fakeConvex.setQuery(api.templates.get, null)
    await renderApp('/templates/gone')
    expect(screen.getByText("This template doesn't exist.")).toBeInTheDocument()
  })

  it('saves only on Save changes, previewing with your business details', async () => {
    fakeConvex.setQuery(api.templates.get, templateDoc())
    fakeConvex.setQuery(api.businesses.list, [businessDoc()])
    fakeConvex.setQuery(api.bankAccounts.list, [bankDoc()])
    const { user, router } = await renderApp('/templates/tpl1')
    // Business and bank details live in Account, not in templates.
    expect(screen.queryByLabelText('Business name')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Bold' }))
    await user.selectOptions(screen.getByLabelText('Payment due'), '14')
    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'QUOTATION')

    const preview = within(screen.getByRole('region', { name: 'Preview' }))
    expect(preview.getByText('Bank Account: 1234567890')).toBeInTheDocument()
    expect(preview.getByRole('heading', { name: 'QUOTATION' })).toBeInTheDocument()
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    // While editing, the actions are Cancel / Save changes.
    expect(screen.queryByRole('button', { name: /New invoice with this/ })).not.toBeInTheDocument()
    await expectNoA11yViolations()
    expect(fakeConvex.handler(api.templates.update)).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(fakeConvex.handler(api.templates.update)).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tpl1', layout: 'bold', dueDays: 14, title: 'QUOTATION' }),
    )
    await waitFor(() => {
      expect(currentPath(router)).toBe('/templates')
    })
  })

  it('cancelling with changes asks first, and discarding saves nothing', async () => {
    fakeConvex.setQuery(api.templates.get, templateDoc())
    fakeConvex.setQuery(api.templates.list, [templateDoc()])
    const { user, router } = await renderApp('/templates/tpl1')
    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'RECEIPT')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    const dialog = await screen.findByRole('dialog', { name: 'Discard your changes?' })
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    expect(screen.getByLabelText('Title')).toHaveValue('RECEIPT')
    expect(currentPath(router)).toBe('/templates/tpl1')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    const again = await screen.findByRole('dialog', { name: 'Discard your changes?' })
    await user.click(within(again).getByRole('button', { name: 'Discard changes' }))
    await waitFor(() => {
      expect(currentPath(router)).toBe('/templates')
    })
    expect(fakeConvex.handler(api.templates.update)).not.toHaveBeenCalled()
  })

  it('keeps your last template: no Delete in its menu', async () => {
    fakeConvex.setQuery(api.templates.get, templateDoc())
    fakeConvex.setQuery(api.templates.list, [templateDoc()])
    const { user } = await renderApp('/templates/tpl1')
    await user.click(screen.getByRole('button', { name: 'More actions' }))
    expect(await screen.findByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('starts a new invoice with this template', async () => {
    fakeConvex.setQuery(api.templates.get, templateDoc())
    fakeConvex.setQuery(api.templates.list, [
      templateDoc(),
      templateDoc({ _id: 'tpl2' as never, name: 'Other' }),
    ])
    fakeConvex.setQuery(api.clients.list, [])
    fakeConvex.setQuery(api.profiles.get, null)
    fakeConvex.setQuery(api.businesses.list, [])
    fakeConvex.setQuery(api.bankAccounts.list, [])
    const { user } = await renderApp('/templates/tpl1')
    await user.click(screen.getByRole('button', { name: /New invoice with this/ }))
    const dialog = await screen.findByRole('dialog', { name: 'New invoice' })
    expect(within(dialog).getByLabelText('Template')).toHaveValue('tpl1')
  })

  it('uploads a picked logo on Save, refusing files over 1 MB', async () => {
    fakeConvex.setQuery(api.templates.get, templateDoc())
    fakeConvex
      .handler(api.templates.generateLogoUploadUrl)
      .mockResolvedValue('https://upload.example')
    vi.stubGlobal('fetch', () =>
      Promise.resolve(new Response(JSON.stringify({ storageId: 'st1' }), { status: 200 })),
    )
    const { user } = await renderApp('/templates/tpl1')

    const big = new File([new Uint8Array(1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Logo image file'), big)
    expect(await screen.findByText('Please use an image under 1 MB.')).toBeInTheDocument()

    const ok = new File([new Uint8Array(10)], 'logo.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Logo image file'), ok)
    expect(await screen.findByRole('img', { name: 'Your logo' })).toBeInTheDocument()
    expect(fakeConvex.handler(api.templates.setLogo)).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => {
      expect(fakeConvex.handler(api.templates.setLogo)).toHaveBeenCalledWith({
        id: 'tpl1',
        storageId: 'st1',
      })
    })
  })

  it('removes the logo on Save', async () => {
    fakeConvex.setQuery(api.templates.get, templateDoc({ logoUrl: 'https://cdn.example/logo.png' }))
    const { user } = await renderApp('/templates/tpl1')
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(screen.queryByRole('img', { name: 'Your logo' })).not.toBeInTheDocument()
    expect(fakeConvex.handler(api.templates.removeLogo)).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(fakeConvex.handler(api.templates.removeLogo)).toHaveBeenCalledWith({ id: 'tpl1' })
  })

  it('adds, renames and removes your own columns', async () => {
    fakeConvex.setQuery(api.templates.get, templateDoc({ columns: DEFAULT_TEMPLATE.columns }))
    const { user } = await renderApp('/templates/tpl1')
    const preview = () => within(screen.getByRole('region', { name: 'Preview' }))
    await user.click(screen.getByRole('button', { name: 'Add a column here' }))
    await user.type(screen.getByLabelText('Your column 1 heading'), 'Venue')
    expect(preview().getByRole('columnheader', { name: 'Venue' })).toBeInTheDocument()

    for (let i = 0; i < 2; i++) {
      await user.click(screen.getByRole('button', { name: 'Add a column here' }))
    }
    expect(screen.getByRole('button', { name: 'Up to 3 columns' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Remove column Venue' }))
    expect(preview().queryByRole('columnheader', { name: 'Venue' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    const saved = fakeConvex.handler(api.templates.update).mock.calls.at(-1)?.[0] as {
      columns: { extra: unknown[] }
    }
    expect(saved.columns.extra).toHaveLength(2)
  })

  it('can show just one amount per item', async () => {
    fakeConvex.setQuery(api.templates.get, templateDoc({ columns: DEFAULT_TEMPLATE.columns }))
    const { user } = await renderApp('/templates/tpl1')
    await user.click(screen.getByRole('radio', { name: 'Just an amount' }))
    expect(screen.getByRole('radio', { name: 'Just an amount' })).toBeChecked()
    expect(screen.queryByLabelText('Rate column heading')).not.toBeInTheDocument()
    const headers = within(screen.getByRole('region', { name: 'Preview' })).getAllByRole(
      'columnheader',
    )
    expect(headers.map((h) => h.textContent)).toEqual(['Description', 'Total (RM)'])
  })

  it('renames the column headings', async () => {
    fakeConvex.setQuery(api.templates.get, templateDoc({ columns: DEFAULT_TEMPLATE.columns }))
    const { user } = await renderApp('/templates/tpl1')
    await user.clear(screen.getByLabelText('Rate column heading'))
    await user.type(screen.getByLabelText('Rate column heading'), 'Rate Per Session / Hour*')
    expect(
      within(screen.getByRole('region', { name: 'Preview' })).getByText(
        'Rate Per Session / Hour* (RM)',
      ),
    ).toBeInTheDocument()
  })
})

describe('new template', () => {
  it('is created only on Create template, with the defaults and your changes', async () => {
    fakeConvex.setQuery(api.businesses.list, [
      businessDoc(),
      businessDoc({ _id: 'biz2' as never, name: 'MIN HEN STUDIO', isDefault: false }),
    ])
    fakeConvex.setQuery(api.bankAccounts.list, [])
    fakeConvex.setQuery(api.templates.list, [])
    fakeConvex.handler(api.templates.create).mockResolvedValue('tplNew')
    const { user, router } = await renderApp('/templates/new')
    expect(screen.getByLabelText('Template name')).toHaveValue('New template')
    await user.clear(screen.getByLabelText('Template name'))
    await user.click(screen.getByRole('button', { name: 'Create template' }))
    expect(screen.getByText('Give it a name.')).toBeInTheDocument()
    expect(fakeConvex.handler(api.templates.create)).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Template name'), 'Voice-over')
    await user.selectOptions(screen.getByLabelText('Business'), 'biz2')
    await user.click(screen.getByRole('button', { name: 'Create template' }))
    expect(fakeConvex.handler(api.templates.create)).toHaveBeenCalledWith({
      fields: { ...DEFAULT_TEMPLATE, name: 'Voice-over' },
      businessId: 'biz2',
      bankAccountId: undefined,
    })
    expect(await screen.findByText('Template created')).toBeInTheDocument()
    await waitFor(() => {
      expect(currentPath(router)).toBe('/templates')
    })
  })

  it('cancel leaves straight away when nothing changed', async () => {
    fakeConvex.setQuery(api.templates.list, [])
    const { user, router } = await renderApp('/templates/new')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => {
      expect(currentPath(router)).toBe('/templates')
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('says so when the template could not be saved', async () => {
    fakeConvex.handler(api.templates.create).mockRejectedValue(new Error('offline'))
    const { user, router } = await renderApp('/templates/new')
    await user.click(screen.getByRole('button', { name: 'Create template' }))
    expect(await screen.findByText("Couldn't save the template.")).toBeInTheDocument()
    expect(currentPath(router)).toBe('/templates/new')
  })
})
