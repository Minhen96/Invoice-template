import { Link } from '@tanstack/react-router'

import { ContactLink, LegalPage, List, OPERATOR, Paragraph, Section } from './legal-page'

/** Terms of service, written plainly. */
export function TermsPage() {
  return (
    <LegalPage title="Terms of service">
      <Paragraph>
        These terms apply when you use Invoices (invoices.dreavelab.com), run by {OPERATOR}. By
        creating an account you agree to them.
      </Paragraph>

      <Section title="Your account">
        <Paragraph>
          Keep your password safe; you&apos;re responsible for what happens in your account. Tell us
          straight away if you think someone else has used it.
        </Paragraph>
      </Section>

      <Section title="Your content">
        <Paragraph>
          What you enter stays yours. You let us store and process it only to run the service for
          you. How we handle it is in the{' '}
          <Link to="/privacy" className="font-medium underline underline-offset-4">
            privacy policy
          </Link>
          .
        </Paragraph>
      </Section>

      <Section title="Fair use">
        <List>
          <li>Don&apos;t use the app for anything illegal, fraudulent or misleading.</li>
          <li>
            Only enter other people&apos;s details (e.g. clients) when you&apos;re allowed to.
          </li>
          <li>Don&apos;t try to break, overload or get around the app&apos;s security.</li>
        </List>
      </Section>

      <Section title="Your invoices">
        <Paragraph>
          The app helps you make and track invoices; it doesn&apos;t give tax, legal or accounting
          advice. You&apos;re responsible for what your invoices say, including amounts, tax (such
          as SST) and your business details.
        </Paragraph>
      </Section>

      <Section title="The service">
        <Paragraph>
          We work to keep it running and your data safe, but it&apos;s provided as it is, without
          guarantees that it will always be available or free of mistakes. Download a backup now and
          then (Account → Your data). We may change or stop the service; if we stop it, we&apos;ll
          give reasonable notice so you can export your data.
        </Paragraph>
      </Section>

      <Section title="Liability">
        <Paragraph>
          As far as the law allows, we aren&apos;t liable for indirect losses (such as lost profit
          or business) from using the app.
        </Paragraph>
      </Section>

      <Section title="Ending">
        <Paragraph>
          You can stop using the app and ask us to delete your account at any time. We may close
          accounts that break these terms.
        </Paragraph>
      </Section>

      <Section title="Changes and law">
        <Paragraph>
          If these terms change, we&apos;ll update the date at the top. Malaysian law applies.
        </Paragraph>
      </Section>

      <Section title="Contact">
        <Paragraph>
          <ContactLink />
        </Paragraph>
      </Section>
    </LegalPage>
  )
}
