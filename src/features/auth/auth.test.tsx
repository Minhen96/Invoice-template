import { api } from '@convex/_generated/api'
import { waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { fakeAuth, fakeConvex } from '@/testing/fake-convex'
import { currentPath, expectNoA11yViolations, renderApp, screen } from '@/testing/render-app'

describe('route guards', () => {
  it('sends signed-out visitors to log in, remembering where they were going', async () => {
    const { router } = await renderApp('/clients', { signedIn: false })
    expect(currentPath(router)).toBe('/login')
    expect(router.state.location.search).toEqual({ redirect: '/clients' })
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('sends signed-in people away from the log-in page', async () => {
    fakeConvex.setQuery(api.invoices.list, [])
    const { router } = await renderApp('/login', { signedIn: true })
    expect(currentPath(router)).toBe('/')
  })

  it('never redirects to another site after log-in', async () => {
    fakeConvex.setQuery(api.invoices.list, [])
    const { router } = await renderApp('/login?redirect=https://evil.example', { signedIn: true })
    expect(currentPath(router)).toBe('/')
  })
})

describe('log in', () => {
  it('is accessible', async () => {
    await renderApp('/login', { signedIn: false })
    await screen.findByRole('heading', { name: 'Log in' })
    await expectNoA11yViolations()
  })

  it('validates before calling the server', async () => {
    const { user } = await renderApp('/login', { signedIn: false })
    await user.click(await screen.findByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('Enter your email.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(fakeAuth.signIn).not.toHaveBeenCalled()
  })

  it('shows one message for a wrong email or password', async () => {
    fakeAuth.signIn.mockRejectedValueOnce(new Error('InvalidSecret'))
    const { user } = await renderApp('/login', { signedIn: false })
    await user.type(await screen.findByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('Wrong email or password.')).toBeInTheDocument()
    expect(fakeAuth.signIn).toHaveBeenCalledWith('password', {
      email: 'me@example.com',
      password: 'wrong-password',
      flow: 'signIn',
    })
  })

  it('asks for the emailed code when the email is not confirmed yet', async () => {
    fakeAuth.signIn.mockResolvedValueOnce({ signingIn: false })
    const { user } = await renderApp('/login', { signedIn: false })
    await user.type(await screen.findByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret-password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Code'), '123456')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => {
      expect(fakeAuth.signIn).toHaveBeenLastCalledWith('password', {
        email: 'me@example.com',
        code: '123456',
        flow: 'email-verification',
      })
    })
  })
})

describe('sign up', () => {
  it('creates the account, then confirms the email with a code', async () => {
    fakeAuth.signIn.mockResolvedValueOnce({ signingIn: false })
    const { user } = await renderApp('/signup', { signedIn: false })
    await user.type(await screen.findByLabelText('Email'), ' Me@Example.com ')
    await user.type(screen.getByLabelText('Password'), 'long-enough')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(fakeAuth.signIn).toHaveBeenCalledWith('password', {
      email: 'Me@Example.com',
      password: 'long-enough',
      flow: 'signUp',
    })
    expect(await screen.findByText(/We sent a 6-digit code/)).toBeInTheDocument()
  })

  it('needs at least 8 characters', async () => {
    const { user } = await renderApp('/signup', { signedIn: false })
    await user.type(await screen.findByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(fakeAuth.signIn).not.toHaveBeenCalled()
  })

  it('rejects a code that is not 6 digits without calling the server', async () => {
    fakeAuth.signIn.mockResolvedValueOnce({ signingIn: false })
    const { user } = await renderApp('/signup', { signedIn: false })
    await user.type(await screen.findByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'long-enough')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await user.type(await screen.findByLabelText('Code'), '12')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Enter the 6-digit code from the email.')).toBeInTheDocument()
    expect(fakeAuth.signIn).toHaveBeenCalledTimes(1)
  })
})

describe('forgot password', () => {
  it("doesn't reveal whether the email has an account", async () => {
    fakeAuth.signIn.mockRejectedValueOnce(new Error('InvalidAccountId'))
    const { user } = await renderApp('/forgot-password', { signedIn: false })
    await user.type(await screen.findByLabelText('Email'), 'nobody@example.com')
    await user.click(screen.getByRole('button', { name: 'Send code' }))
    expect(
      await screen.findByRole('heading', { name: 'Choose a new password' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/has an account, a code is on its way/)).toBeInTheDocument()
  })

  it('sets the new password with the code', async () => {
    const { user } = await renderApp('/forgot-password', { signedIn: false })
    await user.type(await screen.findByLabelText('Email'), 'Me@Example.com')
    await user.click(screen.getByRole('button', { name: 'Send code' }))
    await user.type(await screen.findByLabelText('Code'), '654321')
    await user.type(screen.getByLabelText('New password'), 'brand-new-pass')
    await user.click(screen.getByRole('button', { name: 'Save and log in' }))
    await waitFor(() => {
      expect(fakeAuth.signIn).toHaveBeenLastCalledWith('password', {
        email: 'me@example.com',
        code: '654321',
        newPassword: 'brand-new-pass',
        flow: 'reset-verification',
      })
    })
  })

  it('explains a wrong or expired code', async () => {
    const { user } = await renderApp('/forgot-password', { signedIn: false })
    await user.type(await screen.findByLabelText('Email'), 'me@example.com')
    await user.click(screen.getByRole('button', { name: 'Send code' }))
    fakeAuth.signIn.mockRejectedValueOnce(new Error('Invalid code'))
    await user.type(await screen.findByLabelText('Code'), '000000')
    await user.type(screen.getByLabelText('New password'), 'brand-new-pass')
    await user.click(screen.getByRole('button', { name: 'Save and log in' }))
    expect(await screen.findByText('That code is wrong or has expired.')).toBeInTheDocument()
  })
})

describe('email code step', () => {
  it('sends a new code on request', async () => {
    fakeAuth.signIn.mockResolvedValue({ signingIn: false })
    const { user } = await renderApp('/signup', { signedIn: false })
    await user.type(await screen.findByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'long-enough')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await user.click(await screen.findByRole('button', { name: 'Send a new code' }))
    expect(fakeAuth.signIn).toHaveBeenLastCalledWith('password', {
      email: 'me@example.com',
      password: 'long-enough',
      flow: 'signIn',
    })
    expect(await screen.findByText('We sent a new code.')).toBeInTheDocument()
  })

  it('can go back to use another email', async () => {
    fakeAuth.signIn.mockResolvedValue({ signingIn: false })
    const { user } = await renderApp('/signup', { signedIn: false })
    await user.type(await screen.findByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'long-enough')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await user.click(await screen.findByRole('button', { name: 'Use another email' }))
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
  })

  it('explains when the email already has an account', async () => {
    fakeAuth.signIn.mockRejectedValueOnce(new Error('Account me@example.com already exists'))
    const { user } = await renderApp('/signup', { signedIn: false })
    await user.type(await screen.findByLabelText('Email'), 'me@example.com')
    await user.type(screen.getByLabelText('Password'), 'long-enough')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText(/If you already have one, log in/)).toBeInTheDocument()
  })
})
