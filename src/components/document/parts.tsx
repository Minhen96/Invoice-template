import type { DocumentView } from './view-model'

/** Building blocks shared by the templates. Each template styles them through its own class. */

export function ItemsTable({ view, minRows = 0 }: { view: DocumentView; minRows?: number }) {
  const blanks = Math.max(0, minRows - view.rows.length)
  return (
    <table className="doc-table">
      <thead>
        <tr>
          <th className="doc-col-desc">{view.labels.description}</th>
          <th className="doc-col-num">{view.labels.rate}</th>
          <th className="doc-col-num">{view.labels.quantity}</th>
          <th className="doc-col-num">{view.labels.amount}</th>
        </tr>
      </thead>
      <tbody>
        {view.rows.map((row) => (
          <tr key={row.id}>
            <td className="doc-col-desc doc-pre">{row.description}</td>
            <td className="doc-col-num">{row.rate}</td>
            <td className="doc-col-num">{row.quantity}</td>
            <td className="doc-col-num">{row.amount}</td>
          </tr>
        ))}
        {Array.from({ length: blanks }, (_, i) => (
          <tr key={`blank-${i}`} aria-hidden="true" className="doc-blank">
            <td colSpan={4}>&nbsp;</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function Totals({ view }: { view: DocumentView }) {
  return (
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
  )
}

export function PaymentInfo({
  view,
  heading = 'PAYMENT INFORMATION',
}: {
  view: DocumentView
  heading?: string
}) {
  if (!view.accountName && view.paymentLines.length === 0) return <div />
  return (
    <div className="doc-payment">
      <div className="doc-label">{heading}</div>
      {view.accountName ? <div>{view.accountName}</div> : null}
      {view.paymentLines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  )
}

export function FromBlock({ view, showName = true }: { view: DocumentView; showName?: boolean }) {
  const { from } = view
  return (
    <div className="doc-from">
      {showName && from.name ? <div className="doc-from-name">{from.name}</div> : null}
      {from.regNo ? <div>{from.regNo}</div> : null}
      {from.address ? <div className="doc-pre">{from.address}</div> : null}
      {from.email ? <div>{from.email}</div> : null}
      {from.phone ? <div>{from.phone}</div> : null}
    </div>
  )
}

export function BillTo({ view, heading = 'BILLED TO:' }: { view: DocumentView; heading?: string }) {
  const { billTo } = view
  return (
    <div className="doc-billto">
      <div className="doc-label">{heading}</div>
      {billTo.name ? <div className="doc-billto-name">{billTo.name}</div> : null}
      {billTo.address ? <div className="doc-pre">{billTo.address}</div> : null}
      {billTo.attention ? <div className="doc-attn">Attention: {billTo.attention}</div> : null}
    </div>
  )
}

export function Notes({ view }: { view: DocumentView }) {
  if (!view.notes.trim()) return null
  return <div className="doc-notes doc-pre">{view.notes}</div>
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
