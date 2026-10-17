import type { LayoutId } from '@convex/lib/validators'

import { BillTo, Details, FromBlock, ItemsTable, Logo, Notes, PaymentInfo, Totals } from './parts'
import type { DocumentView } from './view-model'

/**
 * The four page layouts. Same data, different look; styles live in document.css under
 * `.tpl-<id>`. The accent colour arrives as the `--accent` CSS variable.
 */

/** Soft tinted paper, big serif title — a faithful copy of the original pink invoice. */
function Blush({ view }: { view: DocumentView }) {
  return (
    <>
      <header className="b-head">
        <Logo view={view} />
        <h1 className="b-title">{view.title}</h1>
      </header>
      <section className="b-meta">
        <BillTo view={view} />
        <Details className="b-details">
          <div className="b-number">
            <div>
              {view.numberLabel} {view.number}
            </div>
            <div>{view.issueDate}</div>
            {view.dueDate ? <div className="b-due">Due {view.dueDate}</div> : null}
          </div>
        </Details>
      </section>
      <ItemsTable view={view} minRows={3} />
      <Totals view={view} />
      <Notes view={view} />
      <footer className="doc-footer b-foot">
        <PaymentInfo view={view} />
        <FromBlock view={view} />
      </footer>
    </>
  )
}

/** Business letterhead on the left, coloured title on the right. Familiar and formal. */
function Classic({ view }: { view: DocumentView }) {
  return (
    <>
      <header className="c-head">
        <div className="c-brand">
          <Logo view={view} />
          <FromBlock view={view} />
        </div>
        <div className="c-titlebox">
          <h1 className="c-title">{view.title}</h1>
          <Details>
            <dl className="c-meta">
              <div>
                <dt>{view.numberLabel}</dt>
                <dd>{view.number}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{view.issueDate}</dd>
              </div>
              {view.dueDate ? (
                <div>
                  <dt>Due</dt>
                  <dd>{view.dueDate}</dd>
                </div>
              ) : null}
            </dl>
          </Details>
        </div>
      </header>
      <BillTo view={view} heading="Bill to" />
      <ItemsTable view={view} />
      <Totals view={view} />
      <Notes view={view} />
      <footer className="doc-footer c-foot">
        <PaymentInfo view={view} heading="Payment information" />
      </footer>
    </>
  )
}

/** Lots of white space, hairlines, one big number. */
function Minimal({ view }: { view: DocumentView }) {
  return (
    <>
      <header className="m-head">
        <div className="m-left">
          <Logo view={view} />
          <h1 className="m-title">{view.title}</h1>
        </div>
        <Details>
          <div className="m-number">{view.number}</div>
        </Details>
      </header>
      <section className="m-meta">
        <BillTo view={view} heading="Billed to" />
        <Details>
          <div className="doc-label">Issued</div>
          <div>{view.issueDate}</div>
          {view.dueDate ? (
            <>
              <div className="doc-label m-gap">Due</div>
              <div>{view.dueDate}</div>
            </>
          ) : null}
        </Details>
        <div>
          <div className="doc-label">From</div>
          <FromBlock view={view} />
        </div>
      </section>
      <ItemsTable view={view} />
      <Totals view={view} />
      <Notes view={view} />
      <footer className="doc-footer m-foot">
        <PaymentInfo view={view} heading="Payment" />
      </footer>
    </>
  )
}

/** A full-width colour band for the title. Confident and modern. */
function Bold({ view }: { view: DocumentView }) {
  return (
    <>
      <header className="o-band">
        <div>
          <Logo view={view} />
          <h1 className="o-title">{view.title}</h1>
        </div>
        <Details>
          <dl className="o-meta">
            <div>
              <dt>{view.numberLabel}</dt>
              <dd>{view.number}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{view.issueDate}</dd>
            </div>
            {view.dueDate ? (
              <div>
                <dt>Due</dt>
                <dd>{view.dueDate}</dd>
              </div>
            ) : null}
          </dl>
        </Details>
      </header>
      <div className="o-body">
        <section className="o-parties">
          <BillTo view={view} heading="Bill to" />
          <div>
            <div className="doc-label">From</div>
            <FromBlock view={view} />
          </div>
        </section>
        <ItemsTable view={view} />
        <Totals view={view} />
        <Notes view={view} />
        <footer className="doc-footer o-foot">
          <PaymentInfo view={view} heading="Payment information" />
        </footer>
      </div>
    </>
  )
}

const LAYOUTS = { blush: Blush, classic: Classic, minimal: Minimal, bold: Bold }

export function LayoutBody({ layout, view }: { layout: LayoutId; view: DocumentView }) {
  const Layout = LAYOUTS[layout]
  return <Layout view={view} />
}
