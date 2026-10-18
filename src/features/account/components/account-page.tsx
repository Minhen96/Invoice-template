import { api } from '@convex/_generated/api'
import type { Doc } from '@convex/_generated/dataModel'
import { firstInvoiceNumber } from '@convex/lib/numbering'
import { useAuthActions } from '@convex-dev/auth/react'
import { useAction, useQuery } from 'convex/react'
import { LogOut, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import {
  BankAccountDialog,
  BusinessDialog,
  NumberingDialog,
  type Target,
} from '@/components/shared/party-dialogs'
import { LegalLinks } from '@/components/shared/legal-links'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/errors'
import { today } from '@/lib/today'

import { missingBusiness, missingPayment, missingSentence } from '../completeness'

import { DataDialog } from './data-dialog'
import { DeleteAccountDialog } from './delete-account-dialog'
import { PartyListDialog, type PartyListRow } from './party-list-dialog'
import { ChangePasswordDialog } from './password-dialog'
import { SettingsRow } from './settings-row'

function firstLine(text: string): string {
  return (
    text
      .split('\n')
      .find((line) => line.trim() !== '')
      ?.trim() ?? ''
  )
}

/** "Studio A" or "Studio A + 2 more" (the default first). */
function listSummary(rows: readonly PartyListRow[]): string {
  const first = rows.find((row) => row.isDefault) ?? rows[0]
  if (!first) return ''
  return rows.length > 1 ? `${first.title} + ${String(rows.length - 1)} more` : first.title
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="m-0 px-1 text-[13px] font-semibold text-muted">
        {title}
      </h2>
      <Card className="overflow-hidden">{children}</Card>
    </section>
  )
}

/**
 * Everything about you, one line per item. Items open in a popup; ones an invoice still needs
 * are tagged "Incomplete".
 */
export function AccountPage() {
  const profile = useQuery(api.profiles.get)
  const viewer = useQuery(api.account.viewer)
  const businesses = useQuery(api.businesses.list)
  const banks = useQuery(api.bankAccounts.list)
  const { signOut } = useAuthActions()
  const signOutOthers = useAction(api.account.signOutOtherDevices)
  const [business, setBusiness] = useState<Target<Doc<'businesses'>>>(null)
  const [bank, setBank] = useState<Target<Doc<'bankAccounts'>>>(null)
  const [open, setOpen] = useState<'numbering' | 'password' | 'data' | 'delete' | null>(null)
  const [list, setList] = useState<'businesses' | 'banks' | null>(null)
  const [signingOutOthers, setSigningOutOthers] = useState(false)

  const businessRows: PartyListRow[] = (businesses ?? []).map((row) => {
    const missing = missingBusiness(row)
    return {
      id: row._id,
      title: row.name || 'Unnamed business',
      summary: missing.length > 0 ? missingSentence(missing) : firstLine(row.address),
      isDefault: row.isDefault,
      incomplete: missing.length > 0,
      onOpen: () => {
        setList(null)
        setBusiness(row)
      },
    }
  })
  const bankRows: PartyListRow[] = (banks ?? []).map((row) => {
    const missing = missingPayment(row)
    return {
      id: row._id,
      title: row.bankName || 'Bank account',
      summary:
        missing.length > 0
          ? missingSentence(missing)
          : [row.accountNumber, row.accountName].join(' · '),
      isDefault: row.isDefault,
      incomplete: missing.length > 0,
      onOpen: () => {
        setList(null)
        setBank(row)
      },
    }
  })
  const nextNumber = profile?.nextNumber ?? firstInvoiceNumber(today())
  const loading = profile === undefined || businesses === undefined || banks === undefined

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="m-0 text-2xl font-semibold tracking-tight">Account</h1>
        <p className="m-0 mt-1 text-sm text-muted">{viewer?.email ?? ' '}</p>
      </div>

      {loading ? (
        <div role="status" aria-label="Loading account" className="flex flex-col gap-6">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : (
        <>
          <Section id="invoice-details" title="Invoice details">
            <SettingsRow
              title="Business"
              incomplete={businesses.length === 0 || businessRows.some((row) => row.incomplete)}
              summary={
                businesses.length === 0
                  ? 'Add the business you invoice as.'
                  : listSummary(businessRows)
              }
              onOpen={() => {
                if (businesses.length === 0) setBusiness('new')
                else setList('businesses')
              }}
            />
            <SettingsRow
              title="Bank account"
              incomplete={banks.length === 0 || bankRows.some((row) => row.incomplete)}
              summary={banks.length === 0 ? 'Add where clients pay you.' : listSummary(bankRows)}
              onOpen={() => {
                if (banks.length === 0) setBank('new')
                else setList('banks')
              }}
            />
            <SettingsRow
              title="Invoice numbers"
              summary={`Next invoice: ${nextNumber}`}
              onOpen={() => setOpen('numbering')}
            />
          </Section>
        </>
      )}

      <Section id="sign-in" title="Sign-in & data">
        {viewer?.hasPassword ? (
          <SettingsRow
            title="Password"
            summary="Change the password you log in with."
            onOpen={() => setOpen('password')}
          />
        ) : null}
        <SettingsRow
          title="Your data"
          summary="Download your invoices or a full backup."
          onOpen={() => setOpen('data')}
        />
        <SettingsRow
          title="Other devices"
          summary="Log out everywhere except here."
          action={
            <Button
              variant="secondary"
              size="sm"
              loading={signingOutOthers}
              onClick={() => {
                setSigningOutOthers(true)
                signOutOthers()
                  .then(() => toast.success('Other devices are logged out'))
                  .catch((error: unknown) => toast.error(errorMessage(error)))
                  .finally(() => setSigningOutOthers(false))
              }}
            >
              Log out others
            </Button>
          }
        />
        <SettingsRow
          title="This device"
          summary="You stay logged in for 60 days while you use the app."
          action={
            <Button variant="secondary" size="sm" onClick={() => void signOut()}>
              <LogOut /> Log out
            </Button>
          }
        />
        <SettingsRow
          title="Delete account"
          summary="Remove your account and everything in it, for good."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOpen('delete')}
              className="text-danger hover:bg-danger-bg"
            >
              <Trash2 /> Delete
            </Button>
          }
        />
      </Section>

      <LegalLinks className="justify-center" />

      <PartyListDialog
        open={list === 'businesses'}
        title="Your businesses"
        rows={businessRows}
        addLabel="Add business"
        onAdd={() => {
          setList(null)
          setBusiness('new')
        }}
        onClose={() => setList(null)}
      />
      <PartyListDialog
        open={list === 'banks'}
        title="Your bank accounts"
        rows={bankRows}
        addLabel="Add bank account"
        onAdd={() => {
          setList(null)
          setBank('new')
        }}
        onClose={() => setList(null)}
      />
      <BusinessDialog target={business} onClose={() => setBusiness(null)} />
      <BankAccountDialog target={bank} onClose={() => setBank(null)} />
      <NumberingDialog
        open={open === 'numbering'}
        onClose={() => setOpen(null)}
        nextNumber={nextNumber}
      />
      <ChangePasswordDialog open={open === 'password'} onClose={() => setOpen(null)} />
      <DataDialog open={open === 'data'} onClose={() => setOpen(null)} />
      <DeleteAccountDialog
        open={open === 'delete'}
        email={viewer?.email ?? ''}
        onClose={() => setOpen(null)}
        onBackup={() => setOpen('data')}
      />
    </div>
  )
}
