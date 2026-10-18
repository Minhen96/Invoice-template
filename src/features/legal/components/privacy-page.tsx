import { ContactLink, LegalPage, List, OPERATOR, Paragraph, Section } from './legal-page'

/** Privacy policy, written plainly; covers Malaysia's PDPA. */
export function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <Paragraph>
        Invoices (invoices.dreavelab.com) is run by {OPERATOR}. This page explains what we keep
        about you, why, and what you can do about it. We don&apos;t sell your data, show ads or send
        marketing emails.
      </Paragraph>

      <Section title="What we keep">
        <List>
          <li>
            <strong>Your account:</strong> your email address and a scrambled (hashed) form of your
            password — never the password itself. If you sign in with Google, we receive your name,
            email address and profile picture from Google.
          </li>
          <li>
            <strong>What you enter:</strong> your business and bank details (including any ID number
            you choose to print, such as an IC number), clients, invoices, items, templates and
            logos.
          </li>
          <li>
            <strong>To keep you signed in:</strong> a sign-in token stored in your browser. It lasts
            up to 60 days while you use the app. We use no advertising or tracking cookies.
          </li>
        </List>
      </Section>

      <Section title="Why">
        <Paragraph>
          Only to run the service: to sign you in, store your invoices and show them to you, and
          send the 6-digit codes that confirm your email address or reset your password.
        </Paragraph>
      </Section>

      <Section title="Who handles it for us">
        <List>
          <li>
            <strong>Convex</strong> stores your data and runs the app&apos;s backend, on servers in
            Sydney, Australia.
          </li>
          <li>
            <strong>Cloudflare</strong> delivers the website and protects it from attacks.
          </li>
          <li>
            <strong>Resend</strong> sends the sign-in code emails.
          </li>
          <li>
            <strong>Google</strong>, only if you choose to sign in with Google.
          </li>
        </List>
        <Paragraph>
          Because these services are outside Malaysia, your data is transferred abroad. They use it
          only to provide their service to us, and protect it with encryption.
        </Paragraph>
      </Section>

      <Section title="How it's protected">
        <Paragraph>
          Everything travels over HTTPS and is encrypted where it&apos;s stored. Each account can
          only see its own data.
        </Paragraph>
      </Section>

      <Section title="Your choices">
        <List>
          <li>
            <strong>See and take your data:</strong> Account → Your data downloads your invoices
            (CSV) or everything (backup file).
          </li>
          <li>
            <strong>Correct it:</strong> edit it in the app at any time.
          </li>
          <li>
            <strong>Delete your account and data:</strong> Account → Delete account removes
            everything straight away. You can also email us from the address on your account.
          </li>
        </List>
      </Section>

      <Section title="How long we keep it">
        <Paragraph>
          While your account exists. When you delete it, it&apos;s removed straight away (or within
          30 days if you ask us by email); short-lived backups may take a little longer to expire.
        </Paragraph>
      </Section>

      <Section title="Changes">
        <Paragraph>
          If this policy changes, we&apos;ll update the date at the top, and tell you in the app if
          the change matters.
        </Paragraph>
      </Section>

      <Section title="Contact">
        <Paragraph>
          Questions or requests: <ContactLink />
        </Paragraph>
      </Section>
    </LegalPage>
  )
}
