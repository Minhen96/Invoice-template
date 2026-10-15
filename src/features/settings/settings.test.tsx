import { api } from '@convex/_generated/api'
import { ConvexError } from 'convex/values'
import { within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { fakeConvex } from '@/testing/fake-convex'
import { business, profileResult } from '@/testing/fixtures'
import { expectNoA11yViolations, renderApp, screen } from '@/testing/render-app'

function card(name: string) {
  return within(screen.getByRole('heading', { name }).closest('div.rounded-card')!)
}

describe('settings', () => {
  it('starts with empty details for a new account', async () => {
    fakeConvex.setQuery(api.profiles.get, null)
    fakeConvex.setQuery(api.account.viewer, {
      email: 'me@example.com',
      name: '',
      image: null,
      hasPassword: true,
    })
    await renderApp('/settings')
    expect(card('Your business').getByLabelText('Business name')).toHaveValue('')
    await expectNoA11yViolations()
  })

  it('saves business details only after an edit, with Save', async () => {
    fakeConvex.setQuery(api.profiles.get, profileResult())
    const { user } = await renderApp('/settings')
    const section = card('Your business')
    expect(section.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()

    await user.clear(section.getByLabelText('Phone (optional)'))
    await user.type(section.getByLabelText('Phone (optional)'), '012-3456789')
    await user.click(section.getByRole('button', { name: 'Save changes' }))
    expect(fakeConvex.handler(api.profiles.update)).toHaveBeenCalledWith({
      today: '2026-10-15',
      business: { ...business, phone: '012-3456789' },
    })
  })

  it('can cancel an edit', async () => {
    fakeConvex.setQuery(api.profiles.get, profileResult())
    const { user } = await renderApp('/settings')
    const section = card('Payment details')
    await user.type(section.getByLabelText('Bank'), ' Berhad')
    await user.click(section.getByRole('button', { name: 'Cancel' }))
    expect(section.getByLabelText('Bank')).toHaveValue('Public Bank')
  })

  it('changes the password and explains a wrong current one', async () => {
    fakeConvex.setQuery(api.profiles.get, profileResult())
    fakeConvex.setQuery(api.account.viewer, {
      email: 'me@example.com',
      name: '',
      image: null,
      hasPassword: true,
    })
    fakeConvex
      .handler(api.account.changePassword)
      .mockRejectedValueOnce(new ConvexError({ code: 'wrong_password' }))
    const { user } = await renderApp('/settings')
    await user.click(screen.getByRole('button', { name: 'Change' }))
    const dialog = await screen.findByRole('dialog', { name: 'Change password' })
    await user.type(within(dialog).getByLabelText('Current password'), 'old-password')
    await user.type(within(dialog).getByLabelText('New password'), 'new-password-1')
    await user.click(within(dialog).getByRole('button', { name: 'Change password' }))
    expect(await within(dialog).findByText('That password is not right.')).toBeInTheDocument()
  })

  it('hides "change password" for Google-only accounts', async () => {
    fakeConvex.setQuery(api.profiles.get, profileResult())
    fakeConvex.setQuery(api.account.viewer, {
      email: 'me@gmail.com',
      name: 'Me',
      image: null,
      hasPassword: false,
    })
    await renderApp('/settings')
    expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out others' })).toBeInTheDocument()
  })
})
