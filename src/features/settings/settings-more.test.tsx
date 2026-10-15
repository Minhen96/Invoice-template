import { api } from '@convex/_generated/api'
import { waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { fakeConvex } from '@/testing/fake-convex'
import { listRow, profileResult } from '@/testing/fixtures'
import { renderApp, screen } from '@/testing/render-app'

function card(name: string) {
  return within(screen.getByRole('heading', { name }).closest('div.rounded-card')!)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('settings defaults', () => {
  it('saves the next number and default terms together', async () => {
    fakeConvex.setQuery(api.profiles.get, profileResult())
    const { user } = await renderApp('/settings')
    const section = card('New invoice defaults')
    await user.clear(section.getByLabelText('Next invoice number'))
    await user.type(section.getByLabelText('Next invoice number'), 'INV-100')
    await user.selectOptions(section.getByLabelText('Payment due'), '14')
    await user.selectOptions(section.getByLabelText('Template'), 'classic')
    await user.clear(section.getByLabelText('Rate column heading'))
    await user.type(section.getByLabelText('Rate column heading'), 'Rate Per Session / Hour*')
    await user.click(section.getByRole('button', { name: 'Save changes' }))

    const call = fakeConvex.handler(api.profiles.update).mock.calls[0]?.[0]
    expect(call).toMatchObject({
      today: '2026-10-15',
      nextNumber: 'INV-100',
      defaults: expect.objectContaining({
        dueDays: 14,
        template: 'classic',
        labels: expect.objectContaining({ rate: 'Rate Per Session / Hour*' }),
      }),
    })
  })

  it('can turn the due date off', async () => {
    fakeConvex.setQuery(api.profiles.get, profileResult())
    const { user } = await renderApp('/settings')
    const section = card('New invoice defaults')
    await user.selectOptions(section.getByLabelText('Payment due'), 'none')
    await user.click(section.getByRole('button', { name: 'Save changes' }))
    expect(fakeConvex.handler(api.profiles.update).mock.calls[0]?.[0]).toMatchObject({
      defaults: expect.objectContaining({ dueDays: null }),
    })
  })
})

describe('logo', () => {
  it('uploads an image and attaches it', async () => {
    fakeConvex.setQuery(api.profiles.get, profileResult())
    fakeConvex
      .handler(api.profiles.generateLogoUploadUrl)
      .mockResolvedValue('https://upload.example')
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ storageId: 'st1' }), { status: 200 })),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { user } = await renderApp('/settings')
    const file = new File([new Uint8Array(10)], 'logo.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Logo image file'), file)
    await waitFor(() => {
      expect(fakeConvex.handler(api.profiles.setLogo)).toHaveBeenCalledWith({
        storageId: 'st1',
        today: '2026-10-15',
      })
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://upload.example',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('refuses files over 1 MB before uploading', async () => {
    fakeConvex.setQuery(api.profiles.get, profileResult())
    const { user } = await renderApp('/settings')
    const big = new File([new Uint8Array(1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Logo image file'), big)
    expect(await screen.findByText('Please use an image under 1 MB.')).toBeInTheDocument()
    expect(fakeConvex.handler(api.profiles.generateLogoUploadUrl)).not.toHaveBeenCalled()
  })

  it('removes the logo', async () => {
    fakeConvex.setQuery(
      api.profiles.get,
      profileResult({ logoUrl: 'https://cdn.example/logo.png' }),
    )
    const { user } = await renderApp('/settings')
    expect(screen.getByRole('img', { name: 'Your logo' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(fakeConvex.handler(api.profiles.removeLogo)).toHaveBeenCalled()
  })
})

describe('your data', () => {
  it('exports the invoice list as CSV', async () => {
    fakeConvex.setQuery(api.profiles.get, profileResult())
    fakeConvex.setQuery(api.invoices.list, [listRow()])
    const created: Blob[] = []
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: (blob: Blob) => {
        created.push(blob)
        return 'blob:test'
      },
      revokeObjectURL: () => undefined,
    })
    const { user } = await renderApp('/settings')
    await user.click(screen.getByRole('button', { name: /Invoice list \(CSV\)/ }))
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
      version: 1,
      profile: null,
      clients: [],
      invoices: [],
    })
    const created: Blob[] = []
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: (blob: Blob) => {
        created.push(blob)
        return 'blob:test'
      },
      revokeObjectURL: () => undefined,
    })
    const { user } = await renderApp('/settings')
    await user.click(screen.getByRole('button', { name: /Full backup/ }))
    await waitFor(() => {
      expect(created).toHaveLength(1)
    })
    expect(JSON.parse(await created[0]!.text())).toMatchObject({ version: 1, invoices: [] })
  })
})

describe('account', () => {
  it('logs out other devices', async () => {
    fakeConvex.setQuery(api.profiles.get, profileResult())
    const { user } = await renderApp('/settings')
    await user.click(screen.getByRole('button', { name: 'Log out others' }))
    expect(fakeConvex.handler(api.account.signOutOtherDevices)).toHaveBeenCalled()
    expect(await screen.findByText('Other devices are logged out')).toBeInTheDocument()
  })
})
