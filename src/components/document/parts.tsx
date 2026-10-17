import { useContext, type ReactNode } from 'react'

import { EditContext, type EditPart } from './edit-context'
import { EditButton, Editable, EditOnly } from './editable'
import type { DocumentView } from './view-model'

/**
 * Building blocks shared by the layouts. Each layout styles them through its own class. In the
 * editor each block is also clickable (see editable.tsx); on paper they print as-is.
 */

/** "+ Add item" style button shown while editing (never printed). */
function AddButton({ part, label }: { part: EditPart; label: string }) {
  const onEdit = useContext(EditContext)
  if (!onEdit) return null
  return (
    <button
      type="button"
      className="doc-add-btn"
      onClick={() => {
        onEdit(part)
      }}
    >
      + {label}
    </button>
  )
}

export function ItemsTable({ view, minRows = 0 }: { view: DocumentView; minRows?: number }) {
  const blanks = Math.max(0, minRows - view.rows.length)
  return (
    <>
      <table className="doc-table">
        <thead>
          <tr>
            {view.columns.map((column) => (
              <th key={column.key} className={`doc-col-${column.kind}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.rows.map((row, index) => (
            <tr key={row.id} className="doc-row">
              {row.cells.map((cell, i) => {
                const kind = view.columns[i]?.kind ?? 'num'
                return (
                  <td key={view.columns[i]?.key ?? i} className={`doc-col-${kind} doc-pre`}>
                    {cell}
                    {i === 0 ? (
                      <EditButton
                        part={{ kind: 'item', id: row.id }}
                        label={`Edit item ${String(index + 1)}`}
                      />
                    ) : null}
                  </td>
                )
              })}
            </tr>
          ))}
          {Array.from({ length: blanks }, (_, i) => (
            <tr key={`blank-${String(i)}`} aria-hidden="true" className="doc-blank">
              <td colSpan={view.columns.length}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
      <EditOnly>
        <div className="doc-add-row">
          <AddButton part={{ kind: 'addItem' }} label="Add item" />
        </div>
      </EditOnly>
    </>
  )
}

export function Totals({ view }: { view: DocumentView }) {
  return (
    <Editable part={{ kind: 'totals' }} label="Edit discount and tax" className="doc-totals-wrap">
      <dl className="doc-totals">
        <div className="doc-totals-row">
          <dt>Subtotal</dt>
          <dd>{view.subtotal}</dd>
        </div>
        {view.discount ? (
          <div className="doc-totals-row">
            <dt>Discount</dt>
            <dd>-{view.discount}</dd>
          </div>
        ) : null}
        {view.tax ? (
          <div className="doc-totals-row">
            <dt>{view.tax.label}</dt>
            <dd>{view.tax.amount}</dd>
          </div>
        ) : null}
        <div className="doc-totals-row doc-total">
          <dt>Total</dt>
          <dd>
            {view.currency ? <span className="doc-currency">{view.currency} </span> : null}
            {view.total}
          </dd>
        </div>
      </dl>
    </Editable>
  )
}

export function PaymentInfo({
  view,
  heading = 'PAYMENT INFORMATION',
}: {
  view: DocumentView
  heading?: string
}) {
  if (!view.accountName && view.paymentLines.length === 0) {
    return (
      <div>
        <AddButton part={{ kind: 'payment' }} label="Add payment details" />
      </div>
    )
  }
  return (
    <Editable part={{ kind: 'payment' }} label="Edit payment details">
      <div className="doc-payment">
        <div className="doc-label">{heading}</div>
        {view.accountName ? <div>{view.accountName}</div> : null}
        {view.paymentLines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </Editable>
  )
}

export function FromBlock({ view, showName = true }: { view: DocumentView; showName?: boolean }) {
  const { from } = view
  const empty = !from.name && !from.regNo && !from.address && !from.email && !from.phone
  if (empty) return <AddButton part={{ kind: 'from' }} label="Add your business" />
  return (
    <Editable part={{ kind: 'from' }} label="Edit your business details">
      <div className="doc-from">
        {showName && from.name ? <div className="doc-from-name">{from.name}</div> : null}
        {from.regNo ? <div>{from.regNo}</div> : null}
        {from.address ? <div className="doc-pre">{from.address}</div> : null}
        {from.email ? <div>{from.email}</div> : null}
        {from.phone ? <div>{from.phone}</div> : null}
      </div>
    </Editable>
  )
}

export function BillTo({ view, heading = 'BILLED TO:' }: { view: DocumentView; heading?: string }) {
  const { billTo } = view
  return (
    <Editable part={{ kind: 'billTo' }} label="Edit who it's billed to">
      <div className="doc-billto">
        <div className="doc-label">{heading}</div>
        {billTo.name ? <div className="doc-billto-name">{billTo.name}</div> : null}
        {billTo.address ? <div className="doc-pre">{billTo.address}</div> : null}
        {billTo.attention ? <div className="doc-attn">Attention: {billTo.attention}</div> : null}
        {!billTo.name && !billTo.address ? (
          <EditOnly>
            <div className="doc-placeholder">Choose a client</div>
          </EditOnly>
        ) : null}
      </div>
    </Editable>
  )
}

/** Invoice number and dates (each layout lays them out its own way inside this). */
export function Details({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Editable
      part={{ kind: 'details' }}
      label="Edit invoice number and dates"
      {...(className ? { className } : {})}
    >
      {children}
    </Editable>
  )
}

export function Notes({ view }: { view: DocumentView }) {
  if (!view.notes.trim()) {
    return (
      <EditOnly>
        <div className="doc-add-row">
          <AddButton part={{ kind: 'notes' }} label="Add notes" />
        </div>
      </EditOnly>
    )
  }
  return (
    <Editable part={{ kind: 'notes' }} label="Edit notes">
      <div className="doc-notes doc-pre">{view.notes}</div>
    </Editable>
  )
}

export function Logo({ view }: { view: DocumentView }) {
  if (!view.logoUrl) return null
  return <img className="doc-logo" src={view.logoUrl} alt="" />
}

export function PaidStamp({ view }: { view: DocumentView }) {
  if (view.paidOn === null) return null
  return (
    <div className="doc-stamp" aria-label={`Paid on ${view.paidOn}`}>
      <span>PAID</span>
      <small>{view.paidOn}</small>
    </div>
  )
}
